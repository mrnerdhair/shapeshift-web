import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import WalletConnect from '@walletconnect/client'
import type { IWalletConnectSession } from '@walletconnect/types'
import { convertHexToUtf8 } from '@walletconnect/utils'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { selectAssets, selectPortfolioAccountMetadata } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type {
  WalletConnectCallRequest,
  WalletConnectCallRequestResponseMap,
  WalletConnectSessionRequestPayload,
} from './bridge/types'
import { CallRequestModal } from './components/modal/callRequest/CallRequestModal'
import { WalletConnectBridgeContext } from './WalletConnectBridgeContext'

const moduleLogger = logger.child({ namespace: ['WalletConnectBridge'] })

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const [wcAccountId, setWcAccountId] = useState<AccountId | undefined>()
  const [connector, setConnector] = useState<WalletConnect | undefined>()
  const { supportedEvmChainIds, connectedEvmChainId } = useEvm()
  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)
  const evmChainId = useMemo(() => connectedEvmChainId ?? ethChainId, [connectedEvmChainId])
  const chainName = useMemo(() => {
    const name = getChainAdapterManager()
      .get(supportedEvmChainIds.find(chainId => chainId === evmChainId) ?? '')
      ?.getDisplayName()

    return name ?? translate('plugins.walletConnectToDapps.header.menu.unsupportedNetwork')
  }, [evmChainId, supportedEvmChainIds, translate])

  const assets = useAppSelector(selectAssets)

  // will generalize for all evm chains
  const accountExplorerAddressLink = useMemo(() => {
    if (!evmChainId) return ''
    const feeAssetId = getChainAdapterManager().get(evmChainId)?.getFeeAssetId()
    if (!feeAssetId) return ''
    const asset = assets[feeAssetId]
    if (!asset) return ''
    return asset.explorerAddressLink
  }, [assets, evmChainId])

  // wtf?
  const [callRequests, setCallRequests] = useState<WalletConnectCallRequest[]>([])

  const onCallRequest = useCallback(
    (request: WalletConnectCallRequest) => setCallRequests(prev => [...prev, request]),
    [],
  )

  // ...?
  const approveRequest = useCallback(
    async (request: WalletConnectCallRequest, approveData: unknown) => {
      if (!connector) return
      connector.approveRequest(request, approveData as any)
      // setCallRequests(prev => prev.filter(req => req.id !== request.id))
    },
    [connector],
  )

  const signMessage = useCallback(
    async (message: string) => {
      if (!message) return
      if (!wallet) return
      if (!wcAccountId) return
      const accountMetadata = accountMetadataById[wcAccountId]
      if (!accountMetadata) return
      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(bip44Params)
      const payload = { addressNList, message }
      const signedMessage = (await (wallet as ETHWallet).ethSignMessage(payload))?.signature
      if (!signedMessage) throw new Error('EvmBaseAdapter: error signing message')
      return signedMessage
    },
    [accountMetadataById, wallet, wcAccountId],
  )

  const handleSessionRequest = useCallback(
    (error: Error | null, _payload: WalletConnectSessionRequestPayload) => {
      if (error) moduleLogger.error(error, { fn: '_onSessionRequest' }, 'Error session request')
      if (!connector) return
      if (!wcAccountId) return
      const { chainId, account } = fromAccountId(wcAccountId)
      connector.approveSession({
        chainId: parseInt(fromChainId(chainId).chainReference),
        accounts: [account],
      })
    },
    [connector, wcAccountId],
  )

  const handleCallRequest = useCallback(
    async (
      request: WalletConnectCallRequest,
      approveData?: Partial<
        WalletConnectCallRequestResponseMap[keyof WalletConnectCallRequestResponseMap]
      >,
    ) => {
      if (!wallet) return
      if (!wcAccountId) return
      if (!connector) return

      // console.info(request, approveData);

      const maybeChainAdapter = getChainAdapterManager().get(fromAccountId(wcAccountId).chainId)
      if (!maybeChainAdapter) return
      const chainAdapter = maybeChainAdapter as unknown as EvmBaseAdapter<EvmChainId>

      // TODO(0xdef1cafe): IIFE
      let result: any
      switch (request.method) {
        case 'eth_sign': {
          result = await signMessage(convertHexToUtf8(request.params[1]))
          break
        }
        case 'eth_signTypedData': {
          result = await signMessage(request.params[1])
          break
        }
        case 'personal_sign': {
          result = await signMessage(convertHexToUtf8(request.params[0]))
          break
        }
        case 'eth_sendTransaction': {
          const tx = request.params[0]
          const { bip44Params } = accountMetadataById[wcAccountId]
          const { txToSign } = await chainAdapter.buildSendTransaction({
            ...tx,
            wallet,
            bip44Params,
            chainSpecific: {
              gasLimit: tx.gas,
              gasPrice: tx.gasPrice,
            },
          })
          console.info(request, txToSign, approveData)
          try {
            result = await (async () => {
              if (wallet.supportsOfflineSigning()) {
                console.info('here')
                const signedTx = await chainAdapter.signTransaction({
                  txToSign,
                  wallet,
                })
                console.info(signedTx)
                return chainAdapter.broadcastTransaction(signedTx)
              } else if (wallet.supportsBroadcast()) {
                return chainAdapter.signAndBroadcastTransaction({ txToSign, wallet })
              } else {
                throw new Error('Bad hdwallet config')
              }
            })()
          } catch (error) {
            console.error(error)
            moduleLogger.error(error, { fn: 'eth_sendTransaction' }, 'Error sending transaction')
          }
          break
        }
        case 'eth_signTransaction': {
          const tx = request.params[0]
          const addressNList = toAddressNList(accountMetadataById[wcAccountId].bip44Params)
          result = await chainAdapter.signTransaction({
            txToSign: {
              addressNList,
              chainId: parseInt(fromAccountId(wcAccountId).chainReference),
              data: tx.data,
              gasLimit: tx.gas,
              nonce: tx.nonce,
              to: tx.to,
              value: tx.value,
              ...approveData,
            },
            wallet,
          })
          break
        }
        default:
          break
      }
      if (result) {
        // moduleLogger.info('Approve Request', { request, result })
        connector.approveRequest({ id: request.id, result })
      } else {
        const message = 'JSON RPC method not supported'
        // moduleLogger.info("Reject Request (catch)", { request, message })
        connector.rejectRequest({ id: request.id, error: { message } })
      }
    },
    [wallet, wcAccountId, connector, signMessage, accountMetadataById],
  )

  const rejectRequest = useCallback(
    (request: WalletConnectCallRequest) => {
      connector?.rejectRequest(request)
      // wat?
      // setCallRequests(prev => prev.filter(req => req.id !== request.id))
    },
    [connector],
  )

  const subscribeToEvents = useCallback(() => {
    if (!connector) return
    connector.on('session_request', handleSessionRequest)
    connector.on('session_update', handleSessionUpdate)
    connector.on('connect', handleConnect)
    connector.on('disconnect', handleDisconnect)
    connector.on('call_request', handleCallRequest)
  }, [connector])

  const fromURI = useCallback(
    (uri: string) => {
      const c = new WalletConnect({ uri })
      setConnector(c)
      subscribeToEvents()
      // TODO(0xdef1cafe): err handling
      c.connect()
      return c
    },
    [subscribeToEvents],
  )

  const fromSession = useCallback(
    (session: IWalletConnectSession) => {
      const c = new WalletConnect({ session })
      setConnector(c)
      subscribeToEvents()
      // TODO(0xdef1cafe): err handling
      c.connect()
      return c
    },
    [subscribeToEvents],
  )

  const handleSessionUpdate = useCallback(() => {
    if (!connector) return
    if (!wcAccountId) return
    const { chainId, account: address } = fromAccountId(wcAccountId)
    const chainAdapter = getChainAdapterManager().get(chainId)
    if (!chainAdapter) return
    connector.updateSession({
      chainId: parseInt(fromChainId(chainId).chainReference),
      accounts: [address],
    })
  }, [connector, wcAccountId])

  const handleConnect = useCallback(async () => {
    if (!connector) return
    if (connector.connected) return
    await connector.createSession()
    subscribeToEvents()
  }, [connector, subscribeToEvents])

  const handleDisconnect = useCallback(async () => {
    if (!connector) return
    await connector.killSession()
    connector.off('session_request')
    connector.off('session_update')
    connector.off('connect')
    connector.off('disconnect')
    connector.off('call_request')
  }, [connector])

  /**
   * public method for consumers
   */
  const connect = useCallback((uri: string) => fromURI(uri), [fromURI])

  const maybeHydrateSession = useCallback(() => {
    if (connector) return
    const wcSessionJsonString = localStorage.getItem('walletconnect')
    if (!wcSessionJsonString) return
    const session = JSON.parse(wcSessionJsonString)
    fromSession(session)
  }, [connector, fromSession])

  // if connectedEvmChainId or wallet changes, update the walletconnect session
  useEffect(() => {
    if (connectedEvmChainId && connector && dapp && wallet && supportsETH(wallet) && wcAccountId) {
      const chainReference = fromChainId(connectedEvmChainId).chainReference
      const chainId = parseInt(chainReference)
      const accounts = [fromAccountId(wcAccountId).account]
      connector.updateSession({ chainId, accounts })
    }
    // we want to only look for chainId or wallet changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedEvmChainId, wallet])

  /**
   * reconnect on mount
   */
  useEffect(() => {
    maybeHydrateSession()
  })

  const dapp = useMemo(() => connector?.peerMeta ?? null, [connector])

  return (
    <WalletConnectBridgeContext.Provider
      value={{
        fromURI,
        fromSession,
        connector,
        dapp,
        callRequests,
        connect,
        disconnect: handleDisconnect,
        approveRequest,
        rejectRequest,
        chainName,
        evmChainId,
        accountExplorerAddressLink,
        wcAccountId,
        setWcAccountId,
      }}
    >
      {children}
      <CallRequestModal callRequest={callRequests[0]} />
    </WalletConnectBridgeContext.Provider>
  )
}