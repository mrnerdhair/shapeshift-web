import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { HStack, ModalCloseButton, ModalHeader } from '@chakra-ui/react'
import type { WalletConnectCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import { convertHexToUtf8 } from '@walletconnect/utils'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { RawText, Text } from 'components/Text'

import type { ConfirmData } from './CallRequestCommon'
import { SendTransactionConfirmation } from './methods/SendTransactionConfirmation'
import { SignMessageConfirmation } from './methods/SignMessageConfirmation'
import { SignTransactionConfirmation } from './methods/SignTransactionConfirmation'
import { SignTypedDataConfirmation } from './methods/SignTypedDataConfirmation'

type WalletConnectModalProps = {
  callRequest: WalletConnectCallRequest | undefined
}

export const CallRequestModal: FC<WalletConnectModalProps> = ({ callRequest }) => {
  const { approveRequest, rejectRequest, chainName } = useWalletConnect()

  const approve = useCallback(
    (data?: ConfirmData) => !!callRequest && approveRequest(callRequest, data),
    [approveRequest, callRequest],
  )
  const reject = useCallback(
    () => !!callRequest && rejectRequest(callRequest),
    [rejectRequest, callRequest],
  )

  const content = useMemo(() => {
    if (!callRequest) return null
    switch (callRequest.method) {
      case 'eth_sign':
        return (
          <SignMessageConfirmation
            message={convertHexToUtf8(callRequest.params[1])}
            onConfirm={approve}
            onReject={reject}
          />
        )
      case 'personal_sign':
        return (
          <SignMessageConfirmation
            message={convertHexToUtf8(callRequest.params[0])}
            onConfirm={approve}
            onReject={reject}
          />
        )
      case 'eth_signTypedData':
        return (
          <SignTypedDataConfirmation request={callRequest} onConfirm={approve} onReject={reject} />
        )
      case 'eth_signTransaction':
        return (
          <SignTransactionConfirmation
            request={callRequest.params[0]}
            onConfirm={approve}
            onReject={reject}
          />
        )
      case 'eth_sendTransaction':
        return (
          <SendTransactionConfirmation
            request={callRequest.params[0]}
            onConfirm={approve}
            onReject={reject}
          />
        )
      default:
        return null
    }
  }, [callRequest, approve, reject])

  const canRenderCallRequest = !!content
  const rejectRequestIfCannotRender = useCallback(() => {
    if (!!callRequest && !canRenderCallRequest) {
      rejectRequest(callRequest)
    }
  }, [callRequest, rejectRequest, canRenderCallRequest])
  useEffect(rejectRequestIfCannotRender, [rejectRequestIfCannotRender])

  return (
    <Modal isOpen={!!callRequest} onClose={reject} variant='header-nav'>
      <ModalOverlay />

      <ModalContent
        width='full'
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <ModalHeader py={2}>
          <HStack alignItems='center' spacing={2}>
            <WalletConnectIcon />
            <Text fontSize='md' translation='plugins.walletConnectToDapps.modal.title' flex={1} />
            <RawText rounded='lg' fontSize='sm' px='2' bgColor='purple.600'>
              {chainName}
            </RawText>
            <ModalCloseButton position='static' />
          </HStack>
        </ModalHeader>
        {content}
      </ModalContent>
    </Modal>
  )
}
