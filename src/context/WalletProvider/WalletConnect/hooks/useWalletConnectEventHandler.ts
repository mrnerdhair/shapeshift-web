import { Events } from '@shapeshiftoss/hdwallet-core'
import type { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import type { Dispatch } from 'react'
import { useCallback, useEffect, useState } from 'react'
// import { useTranslate } from 'react-polyglot'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import type { InitialState } from 'context/WalletProvider/WalletProvider'
import { logger } from 'lib/logger'

import { clearLocalWallet } from '../../local-wallet'
import { WalletConnectConfig } from '../config'
import { WalletNotFoundError } from '../Error'

const moduleLogger = logger.child({
  namespace: ['WalletConnect', 'Hooks', 'EventHandler'],
})

export const useWalletConnectEventHandler = (
  state: InitialState,
  dispatch: Dispatch<ActionTypes>,
) => {
  moduleLogger.info({ fn: 'useWalletConnectEventHandler' }, 'begins')
  const { keyring, walletInfo, adapters } = state
  const [initialized, setInitialized] = useState(false)
  //   const { history } = props
  //   const translate = useTranslate()

  //   const setErrorLoading = (e: string | null) => {
  //     setError(e)
  //     setLoading(false)
  //   }

  const pairDevice = useCallback(async () => {
    const registerDisconnectEventHandler = () => {
      keyring.on(['*', '*', Events.DISCONNECT], async (deviceId: string) => {
        moduleLogger.info(
          { deviceId, walletDeviceId: walletInfo?.deviceId, fn: 'WC: handleDisconnect' },
          'Device Disconnected',
        )
        try {
          moduleLogger.info({ deviceId, fn: 'WC: handleDisconnect' }, 'using device id')
          // if (useDeviceId === state.walletInfo?.deviceId) {
          moduleLogger.info(
            { deviceId, fn: 'WC: handleDisconnect' },
            'Dispatching SET_IS_CONNECTED false',
          )
          dispatch({ type: WalletActions.RESET_STATE })
          clearLocalWallet()
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
          //   history.push('/walletconnect/failure')
          // }
        } catch (e) {
          moduleLogger.error(e, { fn: 'handleDisconnect' }, 'Device Disconnected Error')
        }
      })
    }

    moduleLogger.info({ fn: 'WC.pairDevice' }, 'pairDevice1')
    // setError(null)
    // setLoading(true)

    if (!(state.provider && 'connector' in state.provider)) {
      moduleLogger.info({ fn: 'WC.pairDevice' }, 'pairDevice2b')
      throw new Error('walletProvider.walletconnect.errors.connectFailure')
    }

    try {
      moduleLogger.info({ fn: 'WC.pairDevice' }, 'pairDevice2a')
      //   state.provider.wc.on('disconnect', () => {
      //     // Handle WalletConnect session rejection
      //     moduleLogger.info({ fn: 'WC: handleDisconnect' }, 'walletconnect disconnect event received')
      //     history.push('/walletconnect/failure')
      //   })
      //   moduleLogger.info({ fn: 'WC.pairDevice' }, 'pairDevice3')

      registerDisconnectEventHandler()

      moduleLogger.info({}, 'pairDevice4')
      if (adapters && adapters?.has(KeyManager.WalletConnect)) {
        moduleLogger.info({}, 'pairDevice5')
        const wallet = (await adapters
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
      moduleLogger.error(e, { fn: 'WC.pairDevice' }, 'error pairing')
      if (e instanceof WalletNotFoundError) {
        moduleLogger.error(
          e,
          { fn: 'pairDevice' },
          'WalletConnect Connect: There was an error initializing the wallet',
        )
        moduleLogger.info({}, 'pairDevice14')
        // setErrorLoading(translate(e.message))
        moduleLogger.info({ fn: 'WC.pairDevice' }, 'pairDevice15')
      } else {
        moduleLogger.info({}, 'pairDevice16')
        // history.push('/walletconnect/failure')
      }
    }
  }, [adapters, dispatch, keyring, state, walletInfo])

  useEffect(() => {
    moduleLogger.info(
      { fn: 'useEffect' },
      `initialized: ${initialized}, state.provider: ${state.provider}`,
    )
    if (initialized) {
      return
    }
    if (!state.provider) {
      return
    }

    const handleConnect = async () => {
      moduleLogger.info({ fn: 'handleConnect' }, 'handleConnect')
      await pairDevice()
      moduleLogger.info({ fn: 'handleConnect' }, 'device paired')
    }
    moduleLogger.info({ fn: 'useEffect' }, 'registering connect event handler')
    keyring.on(['*', '*', Events.CONNECT], handleConnect)
    setInitialized(true)
    return () => {
      moduleLogger.info({ fn: 'destructor' }, 'unregistering connect event handler')
      keyring.off(['*', '*', Events.CONNECT], handleConnect)
    }
  }, [initialized, setInitialized, keyring, pairDevice, state.provider])

  return { pairDevice }
}
