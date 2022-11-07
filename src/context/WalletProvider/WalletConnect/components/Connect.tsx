import { useEffect, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { ConnectModal } from '../../components/ConnectModal'
import type { LocationState } from '../../NativeWallet/types'
import { useWalletConnectEventHandler } from '../hooks/useWalletConnectEventHandler'

const moduleLogger = logger.child({
  namespace: ['WalletConnect', 'Components', 'Connect'],
})

export interface WalletConnectSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

/**
 * WalletConnect Connect component
 *
 * Test WalletConnect Tool: https://test.walletconnect.org/
 */
export const WalletConnectConnect = ({ history }: WalletConnectSetupProps) => {
  moduleLogger.debug({ history }, '')
  const { dispatch, state, onProviderChange } = useWallet()
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const { pairDevice } = useWalletConnectEventHandler(state, dispatch)
  useEffect(() => {
    ;(async () => {
      await onProviderChange(KeyManager.WalletConnect)
    })()
  }, [onProviderChange])

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
