import { Events } from '@shapeshiftoss/hdwallet-core'
import type { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import React, { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { ConnectModal } from '../../components/ConnectModal'
import { clearLocalWallet } from '../../local-wallet'
import type { LocationState } from '../../NativeWallet/types'
import { WalletConnectConfig } from '../config'
import { WalletNotFoundError } from '../Error'

export interface WalletConnectSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

const moduleLogger = logger.child({
  namespace: ['WalletConnect', 'Components', 'Connect'],
})

/**
 * WalletConnect Connect component
 *
 * Test WalletConnect Tool: https://test.walletconnect.org/
 */
export const WalletConnectConnect = ({ history }: WalletConnectSetupProps) => {
  const { dispatch, state, onProviderChange } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const translate = useTranslate()

  const setErrorLoading = (e: string | null) => {
    setError(e)
    setLoading(false)
  }

  useEffect(() => {
    ;(async () => {
      await onProviderChange(KeyManager.WalletConnect)
    })()
  }, [onProviderChange])

  const pairDevice = async () => {
    moduleLogger.info({}, 'pairDevice1')
    setError(null)
    setLoading(true)

    if (!(state.provider && 'connector' in state.provider)) {
      moduleLogger.info({}, 'pairDevice2b')
      throw new Error('walletProvider.walletconnect.errors.connectFailure')
    }

    try {
      moduleLogger.info({}, 'pairDevice2a')
      state.provider.wc.on('disconnect', () => {
        // Handle WalletConnect session rejection
        moduleLogger.info({ fn: 'WC: handleDisconnect' }, 'walletconnect disconnect event received')
        history.push('/walletconnect/failure')
      })
      moduleLogger.info({}, 'pairDevice3')
      // state.provider.wc.connector.on('disconnect', () => {
      //   // Handle WalletConnect session rejection
      //   console.info('walletconnect disconnect event received')
      //   history.push('/walletconnect/failure')
      // })
      state.keyring.on(['*', '*', Events.DISCONNECT], async (deviceId: string) => {
        moduleLogger.info(
          { deviceId, walletDeviceId: state.walletInfo?.deviceId, fn: 'WC: handleDisconnect' },
          'Device Disconnected',
        )
        try {
          const aliases = state.keyring.aliases
          moduleLogger.info({}, JSON.stringify(aliases))
          const id = state.keyring.getAlias(deviceId)
          moduleLogger.info({ deviceId }, `id: ${id}`)

          let useDeviceId = id
          if (id.startsWith('wc:')) {
            const s = id.split(':')
            if (s.length === 2) {
              useDeviceId = s[1]
            }
          }

          moduleLogger.info({ useDeviceId, fn: 'WC: handleDisconnect' }, 'using device id')
          // if (useDeviceId === state.walletInfo?.deviceId) {
          moduleLogger.info(
            { useDeviceId, fn: 'WC: handleDisconnect' },
            'Dispatching SET_IS_CONNECTED false',
          )
          dispatch({ type: WalletActions.RESET_STATE })
          clearLocalWallet()
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
          history.push('/walletconnect/failure')
          // }
        } catch (e) {
          moduleLogger.error(e, { fn: 'handleDisconnect' }, 'Device Disconnected Error')
        }
      })
      moduleLogger.info({}, 'pairDevice4')
      if (state.adapters && state.adapters?.has(KeyManager.WalletConnect)) {
        moduleLogger.info({}, 'pairDevice5')
        const wallet = (await state.adapters
          .get(KeyManager.WalletConnect)
          ?.pairDevice()) as WalletConnectHDWallet
        moduleLogger.info({}, 'pairDevice6')
        if (!wallet) {
          throw new WalletNotFoundError()
        }
        moduleLogger.info({}, 'pairDevice7')
        const { name, icon } = WalletConnectConfig
        const deviceId = await wallet.getDeviceID()
        moduleLogger.info({ deviceId }, 'pairDevice8')
        // const adapt = state.adapters.get(KeyManager.WalletConnect)

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId },
        })
        moduleLogger.info({}, 'pairDevice9')
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        moduleLogger.info({}, 'pairDevice10')
        setLocalWalletTypeAndDeviceId(KeyManager.WalletConnect, deviceId)
        moduleLogger.info({}, 'pairDevice11')
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        moduleLogger.info({}, 'pairDevice12')
      }
    } catch (e: unknown) {
      moduleLogger.info({}, 'pairDevice13')
      if (e instanceof WalletNotFoundError) {
        moduleLogger.error(
          e,
          { fn: 'pairDevice' },
          'WalletConnect Connect: There was an error initializing the wallet',
        )
        moduleLogger.info({}, 'pairDevice14')
        setErrorLoading(translate(e.message))
        moduleLogger.info({}, 'pairDevice15')
      } else {
        moduleLogger.info({}, 'pairDevice16')
        history.push('/walletconnect/failure')
      }
    }
  }
  moduleLogger.info({}, 'pairDevice17')
  // The WalletConnect modal handles desktop and mobile detection as well as deep linking
  return (
    <ConnectModal
      headerText={'walletProvider.walletConnect.connect.header'}
      bodyText={'walletProvider.walletConnect.connect.body'}
      buttonText={'walletProvider.walletConnect.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
