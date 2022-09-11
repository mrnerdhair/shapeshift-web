import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Divider, HStack, IconButton, Image, Link, useColorModeValue, VStack } from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'
import { FC } from 'react'

type Props = {
  message: string
  dapp: {
    image: string
    name: string
    url: string
  }
}

export const SignMessageConfirmation: FC<Props> = ({ message, dapp }) => {
  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.signingFrom'
          mb={4}
        />
        <Card bg={useColorModeValue('white', 'gray.850')} p={4}>
          Wallet summary...
        </Card>
      </Box>

      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.requestFrom'
          mb={4}
        />
        <Card bg={useColorModeValue('white', 'gray.850')}>
          <HStack align='center' px={4} py={3}>
            <Image borderRadius='full' boxSize='24px' src={dapp.image} />
            <RawText fontWeight='semibold' flex={1}>
              {dapp.name}
            </RawText>
            <Link href={dapp.url} isExternal>
              <IconButton
                icon={<ExternalLinkIcon />}
                variant='ghost'
                size='small'
                aria-label={dapp.name}
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
            <RawText fontWeight='medium' color='gray'>
              {message}
            </RawText>
          </Box>
        </Card>
      </Box>

      <Text
        fontWeight='medium'
        color='gray'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
    </VStack>
  )
}
