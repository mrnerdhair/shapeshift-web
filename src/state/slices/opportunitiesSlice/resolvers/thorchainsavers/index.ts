import type { AssetId, ToAssetIdArgs } from '@shapeshiftoss/caip'
import { adapters, fromAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetById, selectFeatureFlags, selectMarketDataById } from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
  OpportunityId,
  OpportunityMetadata,
  StakingId,
} from '../../types'
import { serializeUserStakingId, toOpportunityId } from '../../utils'
import type {
  OpportunitiesMetadataResolverInput,
  OpportunitiesUserDataResolverInput,
} from '../types'
import {
  fromThorBaseUnit,
  getAccountAddresses,
  getMidgardPools,
  getThorchainPools,
  getThorchainSaversPositions,
} from './utils'

export const thorchainSaversOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const thorchainPools = await getThorchainPools()

  if (!thorchainPools.length) {
    throw new Error('Error fetching THORChain pools')
  }

  const opportunityIds = thorchainPools.reduce<OpportunityId[]>((acc, currentPool) => {
    const maybeOpportunityId = adapters.poolAssetIdToAssetId(currentPool.asset)

    if (
      bnOrZero(currentPool.savers_depth).gt(0) &&
      maybeOpportunityId &&
      currentPool.status === 'Available'
    ) {
      acc.push(maybeOpportunityId as StakingId)
    }

    return acc
  }, [])

  return {
    data: opportunityIds,
  }
}

export const thorchainSaversStakingOpportunitiesMetadataResolver = async ({
  opportunityIds,
  opportunityType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const { SaversVaults } = selectFeatureFlags(state)

  if (!(SaversVaults && opportunityIds?.length)) {
    throw new Error('Not ready to fetch THORChain savers metadata')
  }

  const midgardPools = await getMidgardPools()

  // It might be tempting to paralelize the two THOR requests - don't
  // Midgard is less reliable, so there's no point to continue the flow if this fails
  if (!midgardPools.length) {
    throw new Error('Error fetching THORChain midgard pools')
  }

  const thorchainPools = await getThorchainPools()

  if (!thorchainPools.length) {
    throw new Error('Error fetching THORChain pools')
  }

  const stakingOpportunitiesById: Record<StakingId, OpportunityMetadata> = {}

  for (const thorchainPool of thorchainPools) {
    const assetId = adapters.poolAssetIdToAssetId(thorchainPool.asset)
    if (!assetId || !opportunityIds.includes(assetId as OpportunityId)) continue

    const opportunityId = assetId as StakingId

    // Thorchain is slightly different from other opportunities in that there is no contract address for the opportunity
    // The way we represent it, the opportunityId is both the opportunityId/assetId and the underlyingAssetId
    // That's an oversimplification, as this ties a native AssetId e.g btcAssetId or ethAssetId, to a Savers opportunity
    // If we were to ever support another native asset staking opportunity e.g Ethereum 2.0 consensus layer staking
    // we would need to revisit this by using generic keys as an opportunityId
    const asset = selectAssetById(state, assetId)
    const underlyingAsset = selectAssetById(state, assetId)
    const marketData = selectMarketDataById(state, assetId)

    if (!asset || !underlyingAsset || !marketData) continue

    const apy = bnOrZero(
      midgardPools.find(pool => pool.asset === thorchainPool.asset)?.saversAPR,
    ).toString()
    const tvl = fromThorBaseUnit(thorchainPool.savers_units).times(marketData.price).toFixed()
    // NOT the same as the TVL:
    // - TVL is the fiat total of assets locked
    // - supply is the fiat total of assets locked, including the accrued value, accounting in the max. cap
    const saversSupplyIncludeAccruedFiat = fromThorBaseUnit(thorchainPool.savers_depth)
      .times(marketData.price)
      .toFixed()
    const saversMaxSupplyFiat = fromThorBaseUnit(
      bnOrZero(thorchainPool.synth_supply).plus(thorchainPool.synth_supply_remaining),
    )
      .times(marketData.price)
      .toFixed()

    const underlyingAssetRatioBaseUnit = bn(1).times(bn(10).pow(asset.precision)).toString()
    stakingOpportunitiesById[opportunityId] = {
      apy,
      assetId,
      provider: DefiProvider.ThorchainSavers,
      tvl,
      type: DefiType.Staking,
      underlyingAssetId: assetId,
      underlyingAssetIds: [assetId] as [AssetId],
      rewardAssetIds: [assetId] as [AssetId],
      // Thorchain opportunities represent a single native asset being staked, so the ratio will always be 1
      underlyingAssetRatiosBaseUnit: [underlyingAssetRatioBaseUnit],
      name: `${underlyingAsset.symbol} Vault`,
      saversSupplyIncludeAccruedFiat,
      saversMaxSupplyFiat,
      isFull: thorchainPool.synth_mint_paused,
    }
  }

  const data = {
    byId: stakingOpportunitiesById,
    type: opportunityType,
  }

  return { data }
}

export const thorchainSaversStakingOpportunitiesUserDataResolver = async ({
  opportunityType,
  accountId,
  reduxApi,
}: OpportunitiesUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesUserDataByUserStakingId: OpportunitiesState['userStaking']['byId'] = {}

  const stakingOpportunityId = accountIdToFeeAssetId(accountId)

  if (!stakingOpportunityId)
    throw new Error(`Cannot get stakingOpportunityId for accountId: ${accountId}`)

  const asset = selectAssetById(state, stakingOpportunityId)
  if (!asset) throw new Error(`Cannot get asset for stakingOpportunityId: ${stakingOpportunityId}`)

  const toAssetIdParts: ToAssetIdArgs = {
    assetNamespace: fromAssetId(stakingOpportunityId).assetNamespace,
    assetReference: fromAssetId(stakingOpportunityId).assetReference,
    chainId: fromAssetId(stakingOpportunityId).chainId,
  }
  const opportunityId = toOpportunityId(toAssetIdParts)
  const userStakingId = serializeUserStakingId(accountId, opportunityId)

  const allPositions = await getThorchainSaversPositions(stakingOpportunityId)

  if (!allPositions.length)
    throw new Error(
      `Error fetching THORCHain savers positions for assetId: ${stakingOpportunityId}`,
    )

  // Returns either
  // - A tuple made of a single address for EVM and Cosmos chains since the address *is* the account
  // - An array of many addresses for UTXOs, since an xpub can derive many many addresses
  const accountAddresses = await getAccountAddresses(accountId)

  const accountPosition = allPositions.find(
    ({ asset_address }) =>
      asset_address === accountAddresses.find(accountAddress => accountAddress === asset_address),
  )

  // No position for that AccountId, which is actually valid - don't throw
  if (!accountPosition)
    return Promise.resolve({
      data: {
        byId: stakingOpportunitiesUserDataByUserStakingId,
        type: opportunityType,
      },
    })

  const { asset_deposit_value, asset_redeem_value } = accountPosition

  const stakedAmountCryptoBaseUnit = fromThorBaseUnit(asset_deposit_value).times(
    bn(10).pow(asset.precision),
  ) // to actual asset precision base unit

  const stakedAmountCryptoBaseUnitIncludeRewards = fromThorBaseUnit(asset_redeem_value).times(
    bn(10).pow(asset.precision),
  ) // to actual asset precision base unit

  const rewardsAmountsCryptoBaseUnit: [string] = [
    stakedAmountCryptoBaseUnitIncludeRewards.minus(stakedAmountCryptoBaseUnit).toFixed(),
  ]

  stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
    stakedAmountCryptoBaseUnit: stakedAmountCryptoBaseUnit.toFixed(),
    rewardsAmountsCryptoBaseUnit,
  }

  const data = {
    byId: stakingOpportunitiesUserDataByUserStakingId,
    type: opportunityType,
  }

  return Promise.resolve({ data })
}
