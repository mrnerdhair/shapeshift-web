import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  HStack,
  IconButton,
  Image,
  Link,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

import { AddressSummaryCard } from './AddressSummaryCard'

type SignMessageConfirmationProps = {
  message: string
  onConfirm(): void
  onReject(): void
}
export type WalletConnectFeeDataKey = FeeDataKey | 'custom'

export const SignMessageConfirmation: React.FC<SignMessageConfirmationProps> = props => {
  const { message, onConfirm, onReject } = props
  const translate = useTranslate()
  const {
    state: { walletInfo },
  } = useWallet()
  const WalletIcon = walletInfo?.icon ?? FoxIcon

  const cardBg = useColorModeValue('white', 'gray.850')

  const walletConnect = useWalletConnect()
  if (!walletConnect.bridge || !walletConnect.dapp) return null
  const address = walletConnect.bridge?.connector.accounts[0]

  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.signingFrom'
          mb={4}
        />
        <AddressSummaryCard address={address} icon={<WalletIcon w='full' h='full' />} />
      </Box>
      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.requestFrom'
          mb={4}
        />
        <Card bg={cardBg} borderRadius='md'>
          <HStack align='center' pl={4}>
            <Image borderRadius='full' boxSize='24px' src={walletConnect.dapp.icons[0]} />
            <RawText fontWeight='semibold' flex={1}>
              {walletConnect.dapp.name}
            </RawText>
            <Link href={walletConnect.dapp.url} isExternal>
              <IconButton
                icon={<ExternalLinkIcon />}
                variant='ghost'
                aria-label={walletConnect.dapp.name}
                colorScheme='gray'
              />
            </Link>
          </HStack>
          <Divider />
          <Box p={4}>
            <Text
              translation='plugins.walletConnectToDapps.modal.signMessage.message'
              fontWeight='medium'
              mb={1}
            />
            <RawText fontWeight='medium' color='gray.500'>
              {message}
            </RawText>
          </Box>
        </Card>
      </Box>
      <Text
        fontWeight='medium'
        color='gray.500'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
      <VStack spacing={4}>
        <Button size='lg' width='full' colorScheme='blue' type='submit' onClick={onConfirm}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button size='lg' width='full' onClick={onReject}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </VStack>
  )
}