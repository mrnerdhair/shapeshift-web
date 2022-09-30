import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { CowTrade, Trade, TradeQuote } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { getBestSwapperFromArgs, getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import type { TS } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

export const useFees = () => {
  const { setValue } = useFormContext<TS>()
  const featureFlags = useAppSelector(selectFeatureFlags)

  // Selectors
  const assets = useSelector(selectAssets)

  // Constants
  const chainAdapterManager = getChainAdapterManager()

  type setFeesArgs = {
    quoteOrTrade: Trade<KnownChainIds> | CowTrade<KnownChainIds> | TradeQuote<KnownChainIds>
    sellAsset: Asset
    buyAsset: Asset
  }

  // Callbacks
  const setFees = useCallback(
    async ({ quoteOrTrade, sellAsset, buyAsset }: setFeesArgs) => {
      const { chainId: sellAssetChainId } = fromAssetId(sellAsset.assetId)
      const feeAssetId = chainAdapterManager.get(sellAssetChainId)?.getFeeAssetId()
      if (!feeAssetId) return
      const feeAsset = assets[feeAssetId]
      const swapper = await getBestSwapperFromArgs(
        buyAsset.assetId,
        sellAsset.assetId,
        featureFlags,
      )
      if (swapper && quoteOrTrade) {
        const formFees = getFormFees({
          trade: quoteOrTrade,
          sellAsset,
          tradeFeeSource: swapper.name,
          feeAsset,
        })
        console.log('xxx setting fees manually in useFeesService', {
          formFees,
          feeTrade: quoteOrTrade,
          swapper,
        })
        setValue('fees', formFees)
      }
    },
    [assets, chainAdapterManager, featureFlags, setValue],
  )

  return { setFees }
}
