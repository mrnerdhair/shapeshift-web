import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { type GetTradeQuoteInput, type UtxoSupportedChainIds } from '@shapeshiftoss/swapper'
import type { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
import {
  isSupportedNonUtxoSwappingChain,
  isSupportedUtxoSwappingChain,
} from 'components/Trade/hooks/useSwapper/utils'
import type { TS } from 'components/Trade/types'
import { type TradeQuoteInputCommonArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { toBaseUnit } from 'lib/math'
import type { GetTradeQuoteReturn } from 'state/apis/swapper/swapperApi'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import { selectPortfolioAccountIds, selectPortfolioAccountMetadata } from 'state/slices/selectors'
import { useAppDispatch } from 'state/store'

const moduleLogger = logger.child({
  namespace: ['Trade', 'hooks', 'useTradeQuoteService'],
})

type GetTradeQuoteInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountType: UtxoAccountType | undefined
  sellAccountBip44Params: BIP44Params
  wallet: HDWallet
  receiveAddress: NonNullable<TS['receiveAddress']>
  sellAmount: string
}

export const getTradeQuoteArgs = async ({
  sellAsset,
  buyAsset,
  sellAccountBip44Params,
  sellAccountType,
  wallet,
  receiveAddress,
  sellAmount,
}: GetTradeQuoteInputArgs) => {
  if (!sellAsset || !buyAsset) return undefined
  const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
    sellAmount: toBaseUnit(sellAmount, sellAsset?.precision || 0),
    sellAsset,
    buyAsset,
    sendMax: false,
    receiveAddress,
  }
  if (isSupportedNonUtxoSwappingChain(sellAsset?.chainId)) {
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      bip44Params: sellAccountBip44Params,
    }
  } else if (isSupportedUtxoSwappingChain(sellAsset?.chainId)) {
    if (!sellAccountType) throw new Error('no accountType')
    const sellAssetChainAdapter = getChainAdapterManager().get(
      sellAsset.chainId,
    ) as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
    const { xpub } = await sellAssetChainAdapter.getPublicKey(
      wallet,
      sellAccountBip44Params,
      sellAccountType,
    )
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      bip44Params: sellAccountBip44Params,
      accountType: sellAccountType,
      xpub,
    }
  }
}

/*
The Trade Quote Service is responsible for reacting to changes to trade assets and updating the quote accordingly.
The only mutation is on TradeState's quote property.
*/
export const useTradeQuoteService = () => {
  // Form hooks
  const { setValue } = useFormContext<TS>()

  // Hooks
  const dispatch = useAppDispatch()

  // State
  const {
    state: { wallet },
  } = useWallet()
  const [tradeQuoteData, setTradeQuoteData] = useState<GetTradeQuoteReturn>()
  const [isLoadingTradeQuote, setIsLoadingTradeQuote] = useState<boolean>()
  const { receiveAddress } = useSwapper()

  const portfolioAccountMetaData = useSelector(selectPortfolioAccountMetadata)
  const portfolioAccountIds = useSelector(selectPortfolioAccountIds)

  // Constants
  const { getTradeQuote } = swapperApi.endpoints

  // Types
  type GetTradeQuoteCallbackInput = {
    sellAsset: Asset
    buyAsset: Asset
    sellAmount: string
  }

  // Callbacks
  const getTradeQuoteCallback = useCallback(
    async ({
      sellAsset,
      buyAsset,
      sellAmount,
    }: GetTradeQuoteCallbackInput): Promise<GetTradeQuoteReturn | undefined> => {
      const accountIds = portfolioAccountIds.filter(
        accountId => fromAccountId(accountId).chainId === buyAsset.chainId,
      )
      // When getting the quote it doesn't matter which account we use, so we just use the first one
      const firstAccountId = accountIds[0]
      if (!firstAccountId) return
      const accountMetadata = portfolioAccountMetaData[firstAccountId]

      if (sellAsset && buyAsset && wallet && sellAmount && receiveAddress && accountMetadata) {
        const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
        const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

        if (!chainAdapter)
          throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)

        const tradeQuoteInputArgs: GetTradeQuoteInput | undefined = await getTradeQuoteArgs({
          sellAsset,
          sellAccountBip44Params: accountMetadata.bip44Params,
          sellAccountType: accountMetadata.accountType,
          buyAsset,
          wallet,
          receiveAddress,
          sellAmount,
        })

        if (!tradeQuoteInputArgs) return
        try {
          setIsLoadingTradeQuote(true)
          const { data } = await dispatch(getTradeQuote.initiate(tradeQuoteInputArgs))
          setTradeQuoteData(data)
          setValue('quote', tradeQuoteData)
        } catch (error) {
          moduleLogger.error(error, 'Error getting trade quote')
        } finally {
          setIsLoadingTradeQuote(false)
        }

        return tradeQuoteData
      }
    },
    [
      dispatch,
      getTradeQuote,
      portfolioAccountIds,
      portfolioAccountMetaData,
      receiveAddress,
      setValue,
      tradeQuoteData,
      wallet,
    ],
  )

  // Effects
  // Set trade quote
  useEffect(() => {
    console.log('xxx setting trade quote', { tradeQuoteData, isLoadingTradeQuote })
    tradeQuoteData && !isLoadingTradeQuote && setValue('quote', tradeQuoteData)
  }, [tradeQuoteData, setValue, isLoadingTradeQuote])

  return { isLoadingTradeQuote, getTradeQuoteCallback }
}
