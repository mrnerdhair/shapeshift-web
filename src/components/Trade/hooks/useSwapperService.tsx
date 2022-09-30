import { useAccountsService } from 'components/Trade/hooks/useAccountsService'
import { useFees } from 'components/Trade/hooks/useFees'
import { useFiatRateService } from 'components/Trade/hooks/useFiatRateService'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'

/*
The Swapper Service is responsible for reacting to changes to the Trade form and updating state accordingly.
*/
export const useSwapperService = () => {
  // Initialize child services
  const { isLoadingFiatRateData } = useFiatRateService()
  const { isLoadingTradeQuote } = useTradeQuoteService()
  useFees()
  useAccountsService()

  return { isLoadingTradeQuote, isLoadingFiatRateData }
}
