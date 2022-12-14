import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { IdleOpportunity } from '@shapeshiftoss/investor-idle'
import type { DefiButtonProps } from 'features/defi/components/DefiActionButtons'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getIdleInvestor } from 'features/defi/contexts/IdleProvider/idleInvestorSingleton'
import { useEffect, useMemo, useState } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const defaultMenu: DefiButtonProps[] = [
  {
    label: 'common.deposit',
    icon: <ArrowUpIcon />,
    action: DefiAction.Deposit,
  },
  {
    label: 'common.withdraw',
    icon: <ArrowDownIcon />,
    action: DefiAction.Withdraw,
  },
]

type IdleOverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const IdleOverview: React.FC<IdleOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const idleInvestor = useMemo(() => getIdleInvestor(), [])
  const [idleOpportunity, setIdleOpportunity] = useState<IdleOpportunity>()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const vaultTokenId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: contractAddress,
  })
  const assets = useAppSelector(selectAssets)
  const vaultAsset = useAppSelector(state => selectAssetById(state, vaultTokenId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  // user info
  const balanceFilter = useMemo(
    () => ({ accountId, assetId: vaultTokenId }),
    [accountId, vaultTokenId],
  )
  // user info
  const cryptoAmountAvailableBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, balanceFilter),
  )

  const fiatAmountAvailable = useMemo(
    () =>
      bnOrZero(cryptoAmountAvailableBaseUnit)
        .div(bn(10).pow(vaultAsset.precision))
        .times(marketData.price),
    [cryptoAmountAvailableBaseUnit, marketData.price, vaultAsset.precision],
  )

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace: 'erc20', assetReference: contractAddress }),
    [chainId, contractAddress],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, ethChainId))
  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        (accountId ?? highestBalanceAccountId ?? defaultAccountId)!,
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }),
    [accountId, chainId, contractAddress, defaultAccountId, highestBalanceAccountId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  useEffect(() => {
    ;(async () => {
      if (!opportunityData?.assetId) return
      setIdleOpportunity(await idleInvestor.findByOpportunityId(opportunityData.assetId))
    })()
  }, [idleInvestor, opportunityData?.assetId])

  const underlyingAssetId = useMemo(
    () => opportunityData?.underlyingAssetIds?.[0],
    [opportunityData?.underlyingAssetIds],
  )
  const underlyingAsset: Asset | undefined = useMemo(
    () => assets[underlyingAssetId ?? ''],
    [assets, underlyingAssetId],
  )
  const underlyingAssets = useMemo(() => {
    // TODO: maybe abstract me?
    const cryptoBalanceBaseUnit = (() => {
      if (!idleOpportunity) return '0'

      // Idle assets are regular ERC-20 tokens with 18 precision, but their underlying assets can be e.g USDC with 6 dp
      // Since we use the former to derive the latter, we need to make sure the base unit matches the precision of the underlying asset
      if (underlyingAsset.precision === vaultAsset.precision)
        return bn(cryptoAmountAvailableBaseUnit)
          .times(idleOpportunity.positionAsset.underlyingPerPosition)
          .toFixed()

      const precisionOffset = vaultAsset.precision - underlyingAsset.precision

      return bn(cryptoAmountAvailableBaseUnit).div(bn(10).pow(precisionOffset)).toFixed()
    })()
    return [
      {
        ...underlyingAsset,
        // TODO: times pricePerShare
        cryptoBalanceBaseUnit,
        allocationPercentage: '1',
      },
    ]
  }, [cryptoAmountAvailableBaseUnit, idleOpportunity, underlyingAsset, vaultAsset.precision])

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({
    assetId: underlyingAssetId,
    selectedLocale,
  })

  const rewardAssetsCryptoBaseUnit = useMemo(() => {
    if (!opportunityData?.rewardsAmountsCryptoBaseUnit?.length) return []

    return opportunityData!.rewardsAmountsCryptoBaseUnit
      .map((amount, i) => {
        if (!opportunityData?.rewardAssetIds?.[i]) return undefined
        if (!assets[opportunityData.rewardAssetIds[i]]) return undefined
        if (bnOrZero(amount).isZero()) return undefined
        return {
          ...assets[opportunityData.rewardAssetIds[i]],
          cryptoBalanceBaseUnit: amount,
        }
      })
      .filter(isSome)
  }, [assets, opportunityData])

  const hasClaimBalance = useMemo(() => {
    if (!opportunityData?.rewardAssetIds?.length) return false

    return opportunityData.rewardAssetIds?.some((_rewardAssetId, i) =>
      bnOrZero(opportunityData?.rewardsAmountsCryptoBaseUnit?.[i]).gt(0),
    )
  }, [opportunityData?.rewardAssetIds, opportunityData?.rewardsAmountsCryptoBaseUnit])

  const menu: DefiButtonProps[] = useMemo(() => {
    if (!(contractAddress && idleInvestor && opportunityData)) return defaultMenu
    if (!opportunityData?.rewardsAmountsCryptoBaseUnit?.length) return defaultMenu

    return [
      ...defaultMenu,
      {
        icon: <FaGift />,
        colorScheme: 'green',
        label: 'common.claim',
        variant: 'ghost-filled',
        action: DefiAction.Claim,
        isDisabled: !hasClaimBalance,
        toolTip: translate('defi.modals.overview.noWithdrawals'),
      },
    ]
  }, [contractAddress, idleInvestor, opportunityData, hasClaimBalance, translate])

  if (!opportunityData) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  if (!underlyingAssets || !opportunityData) return null

  return (
    <Overview
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={vaultAsset}
      name={opportunityData.name ?? ''}
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssetsCryptoBaseUnit={underlyingAssets}
      provider='Idle Finance'
      description={{
        description: underlyingAsset.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: underlyingAsset.isTrustedDescription,
      }}
      tvl={bnOrZero(opportunityData.tvl).toFixed(2)}
      apy={opportunityData.apy}
      menu={menu}
      rewardAssetsCryptoBaseUnit={rewardAssetsCryptoBaseUnit}
    />
  )
}
