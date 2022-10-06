import type { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import React, { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
// import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { ConnectModal } from '../../components/ConnectModal'
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
  // const isMobileWalletconnectEnabled = useFeatureFlag('MobileWalletConnect')

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
    moduleLogger.info(`WC: Connect: pairDevice`)
    setError(null)
    setLoading(true)

    if (!(state.provider && 'connector' in state.provider)) {
      moduleLogger.info(`WC: ERRORRRRSSs`)
      throw new Error('walletProvider.walletconnect.errors.connectFailure')
    }

    try {
      state.provider.connector.on('disconnect', () => {
        // Handle WalletConnect session rejection
        moduleLogger.info(`WC: pushing failure`)
        history.push('/walletconnect/failure')
      })

      if (state.adapters && state.adapters?.has(KeyManager.WalletConnect)) {
        moduleLogger.info(`WC: Connect.1`)
        const wallet = (await state.adapters
          .get(KeyManager.WalletConnect)
          ?.pairDevice()) as WalletConnectHDWallet

        moduleLogger.info(`WC: Connect.2`)
        if (!wallet) {
          throw new WalletNotFoundError()
        }
        moduleLogger.info(`WC: Connect.3`)

        // if (isMobileWalletconnectEnabled) {
        //   moduleLogger.debug('hi')
        // }
        const { name, icon, supportsMobile } = WalletConnectConfig
        moduleLogger.info(`WC: Connect.4`)
        moduleLogger.debug(`Connect.tsx supportsMobile: ${supportsMobile}`)
        const deviceId = await wallet.getDeviceID()
        moduleLogger.info(`WC: Connect.5`)
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.WalletConnect, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      }
    } catch (e: unknown) {
      if (e instanceof WalletNotFoundError) {
        moduleLogger.error(
          e,
          { fn: 'pairDevice' },
          'WalletConnect Connect: There was an error initializing the wallet',
        )
        setErrorLoading(translate(e.message))
      } else {
        history.push('/walletconnect/failure')
      }
    }
  }

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
