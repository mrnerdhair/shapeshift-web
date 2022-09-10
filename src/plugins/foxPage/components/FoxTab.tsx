import { Flex } from '@chakra-ui/layout'
import type { TabProps } from '@chakra-ui/react'
import { SkeletonText, Tab, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'

type FoxTabProps = {
  assetIcon: string
  assetSymbol: string
  fiatAmount: string
  cryptoAmount: string
  onClick?: () => void
} & TabProps

export const FoxTab: React.FC<FoxTabProps> = ({
  assetIcon,
  assetSymbol,
  fiatAmount,
  cryptoAmount,
  onClick,
  ...props
}) => {
  const bgHover = useColorModeValue('gray.100', 'gray.750')

  const tabStyleProps = useMemo(
    () => ({
      _selected: {
        bg: { base: 'none', md: bgHover },
        borderColor: 'primary',
        borderWidth: { base: 0, md: '2px' },
      },
      _focus: { borderWidth: '0' },
      borderWidth: { base: 0, md: '1px' },
      _hover: { textDecoration: 'none', bg: { base: 'none', md: bgHover } },
    }),
    [bgHover],
  )

  const assetIconContainerSpaceProps = useMemo(
    () => ({
      mb: { base: 0, md: 6 },
      mr: { base: 2, md: 0 },
    }),
    [],
  )

  return (
    <Tab
      borderRadius='xl'
      borderColor={bgHover}
      bg={'none'}
      textAlign='left'
      p={0}
      onClick={onClick}
      {...tabStyleProps}
      {...props}
    >
      <Card display='block' bg='none' border='none' boxShadow='none' p={0} width='full'>
        <Card.Body
          p={4}
          px={{ base: 6, md: 4 }}
          display='flex'
          flexDirection={{ base: 'row', md: 'column' }}
        >
          <Flex alignItems='center' {...assetIconContainerSpaceProps}>
            <AssetIcon src={assetIcon} boxSize='8' zIndex={2} />
          </Flex>
          <SkeletonText isLoaded={true} noOfLines={2}>
            <Amount.Crypto
              color='inherit'
              value={cryptoAmount}
              symbol={assetSymbol}
              lineHeight={'1.2'}
              fontSize={{ base: 'lg', md: '2xl' }}
              fontWeight='semibold'
              maximumFractionDigits={2}
            />
            <Amount.Fiat
              color='gray.500'
              value={fiatAmount}
              lineHeight={'1.2'}
              maximumFractionDigits={2}
            />
          </SkeletonText>
        </Card.Body>
      </Card>
    </Tab>
  )
}
