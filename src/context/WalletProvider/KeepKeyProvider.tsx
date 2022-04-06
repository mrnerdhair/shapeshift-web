import { isKeepKey, KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState
} from 'react'
import { RadioOption } from 'components/Radio/Radio'
import { useWallet } from 'hooks/useWallet/useWallet'

export enum DeviceTimeout {
  TenMinutes = '600000',
  FifteenMinutes = '900000',
  TwentyMinutes = '1200000',
  ThirtyMinutes = '1800000',
  FortyFiveMinutes = '2700000',
  SixtyMinutes = '3600000'
}

export const timeoutOptions: RadioOption<DeviceTimeout>[] = [
  {
    value: DeviceTimeout.TenMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '10' }]
  },
  {
    value: DeviceTimeout.FifteenMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '15' }]
  },
  {
    value: DeviceTimeout.TwentyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '20' }]
  },
  {
    value: DeviceTimeout.ThirtyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '30' }]
  },
  {
    value: DeviceTimeout.FortyFiveMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '45' }]
  },
  {
    value: DeviceTimeout.SixtyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '60' }]
  }
]

export enum KeepKeyActions {
  SET_HAS_PIN_CACHING = 'SET_HAS_PIN_CACHING',
  SET_HAS_PASSPHRASE = 'SET_HAS_PASSPHRASE',
  RESET_STATE = 'RESET_STATE'
}

export interface InitialState {
  hasPinCaching: boolean | undefined
  hasPassphrase: boolean | undefined
  keepKeyWallet: KeepKeyHDWallet | undefined
  deviceTimeout: RadioOption<DeviceTimeout> | undefined
}

const initialState: InitialState = {
  hasPinCaching: undefined,
  hasPassphrase: undefined,
  keepKeyWallet: undefined,
  deviceTimeout: timeoutOptions[0]
}

export interface IKeepKeyContext {
  state: InitialState
  setHasPinCaching: (enabled: boolean) => void
  setHasPassphrase: (enabled: boolean) => void
  keepKeyWallet: KeepKeyHDWallet | undefined
  deviceTimeout: RadioOption<DeviceTimeout> | undefined
}

export type KeepKeyActionTypes =
  | { type: KeepKeyActions.SET_HAS_PIN_CACHING; payload: boolean | undefined }
  | { type: KeepKeyActions.SET_HAS_PASSPHRASE; payload: boolean | undefined }
  | { type: KeepKeyActions.RESET_STATE }

const reducer = (state: InitialState, action: KeepKeyActionTypes) => {
  switch (action.type) {
    case KeepKeyActions.SET_HAS_PASSPHRASE:
      return { ...state, hasPassphrase: action.payload }
    case KeepKeyActions.SET_HAS_PIN_CACHING:
      return { ...state, hasPinCaching: action.payload }
    case KeepKeyActions.RESET_STATE:
      return initialState
    default:
      return state
  }
}

const KeepKeyContext = createContext<IKeepKeyContext | null>(null)

export const KeepKeyProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const {
    state: { wallet }
  } = useWallet()
  const keepKeyWallet = useMemo(() => (wallet && isKeepKey(wallet) ? wallet : undefined), [wallet])
  // const [pinCaching, setPinCaching] = useState<boolean>()
  // const [passphrase, setPassphrase] = useState<boolean>()
  const [deviceTimeout, setDeviceTimeout] = useState<RadioOption<DeviceTimeout>>()
  const [state, dispatch] = useReducer(reducer, initialState)

  const setHasPinCaching = useCallback((payload: boolean | undefined) => {
    dispatch({
      type: KeepKeyActions.SET_HAS_PIN_CACHING,
      payload
    })
  }, [])

  const setHasPassphrase = useCallback((payload: boolean | undefined) => {
    dispatch({
      type: KeepKeyActions.SET_HAS_PASSPHRASE,
      payload
    })
  }, [])

  useEffect(() => {
    if (!keepKeyWallet) return
    ;(async () => {
      setHasPassphrase(keepKeyWallet?.features?.passphraseProtection)
      setHasPinCaching(
        keepKeyWallet?.features?.policiesList.find(p => p.policyName === 'Pin Caching')?.enabled
      )
      setDeviceTimeout(
        Object.values(timeoutOptions).find(
          t => Number(t.value) === keepKeyWallet?.features?.autoLockDelayMs
        )
      )
    })()
  }, [keepKeyWallet, setHasPassphrase, setHasPinCaching])

  const value: IKeepKeyContext = useMemo(
    () => ({
      state,
      keepKeyWallet,
      deviceTimeout,
      setHasPinCaching,
      setHasPassphrase
    }),
    [deviceTimeout, keepKeyWallet, setHasPassphrase, setHasPinCaching, state]
  )

  return <KeepKeyContext.Provider value={value}>{children}</KeepKeyContext.Provider>
}

export const useKeepKey = (): IKeepKeyContext =>
  useContext(KeepKeyContext as React.Context<IKeepKeyContext>)
