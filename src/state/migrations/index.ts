import { clearOpportunitiesSlice } from './000_clear_opportunities_slice'
import { clearDeprecatedYearnOpportunities } from './000_clear_yearn_opportunities_slice'

export const migrations = {
  0: clearOpportunitiesSlice,
  1: clearDeprecatedYearnOpportunities,
}
