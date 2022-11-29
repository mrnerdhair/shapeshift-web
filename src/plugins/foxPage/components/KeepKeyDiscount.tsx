import { Button, Flex, Image, Link } from '@chakra-ui/react'
import KeepKeyLogo from 'assets/keepkey-logo.svg'
import { Card } from 'components/Card/Card'
import { RawText } from 'components/Text'

export const KeepKeyDiscount = () => {
  return (
    <Card>
      <Card.Body display='flex' gap={6} flexDirection='column'>
        <Flex justifyContent='space-between'>
          <Flex flexDir='column'>
            <RawText fontSize='xl' fontWeight='bold'>
              Get $15 off KeepKey
            </RawText>
            <RawText color='gray.500'>and swag if you hold XX FOX.</RawText>
          </Flex>
          <Image src={KeepKeyLogo} height='40px' />
        </Flex>

        <Button as={Link} href='https://dappback.com/shapeshift' isExternal colorScheme='blue'>
          Learn More
        </Button>
      </Card.Body>
    </Card>
  )
}
