import { CloseIcon } from '@chakra-ui/icons'
import { MenuGroup } from '@chakra-ui/menu'
import { Box, HStack, Link, MenuDivider, MenuItem, VStack } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DappAvatar } from './DappAvatar'

export const DappHeaderMenuSummary = () => {
  const { supportedEvmChainIds } = useEvm()
  const chainAdapterManager = getChainAdapterManager()
  const selectedLocale = useAppSelector(selectSelectedLocale)

  const ethAsset = useAppSelector(s => selectAssetById(s, ethAssetId))
  const translate = useTranslate()

  const walletConnect = useWalletConnect()
  const connectedChainId = walletConnect.bridge?.connector.chainId
  const chainName = useMemo(() => {
    const name = chainAdapterManager
      .get(supportedEvmChainIds.find(chainId => chainId === `eip155:${connectedChainId}`) ?? '')
      ?.getDisplayName()

    return name ?? translate('plugins.walletConnectToDapps.header.menu.unsupportedNetwork')
  }, [chainAdapterManager, connectedChainId, supportedEvmChainIds, translate])
  const handleDisconnect = walletConnect.disconnect

  const connectedAccountAddress = walletConnect?.bridge?.connector.accounts[0] ?? ''

  if (!walletConnect.bridge || !walletConnect.dapp) return null

  return (
    <>
      <MenuGroup
        title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
        ml={3}
        color='gray.500'
      >
        <HStack spacing={4} px={3} py={1}>
          <DappAvatar
            name={walletConnect.dapp.name}
            image={walletConnect.dapp.icons[0]}
            connected={walletConnect.bridge.connector.connected}
          />
          <Box fontWeight='medium'>
            <RawText>{walletConnect.dapp.name}</RawText>
            <RawText fontSize='sm' color='gray.500'>
              {walletConnect.dapp.url.replace(/^https?:\/\//, '')}
            </RawText>
          </Box>
        </HStack>
      </MenuGroup>
      <MenuDivider />

      <VStack px={3} py={1} fontWeight='medium' spacing={1} alignItems='stretch'>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.connected' color='gray.500' />
          <RawText>
            {dayjs(walletConnect.bridge.connector.handshakeId / 1000)
              .locale(selectedLocale)
              .format('ll hh:mm A')}
          </RawText>
        </HStack>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.address' color='gray.500' />
          <Link href={`${ethAsset.explorerAddressLink}${connectedAccountAddress}`} isExternal>
            <MiddleEllipsis value={connectedAccountAddress} color='blue.200' />
          </Link>
        </HStack>
        {!!connectedChainId && (
          <HStack justifyContent='space-between' spacing={4}>
            <Text translation='plugins.walletConnectToDapps.header.menu.network' color='gray.500' />
            <RawText>{chainName}</RawText>
          </HStack>
        )}
      </VStack>

      <MenuDivider />
      <MenuItem fontWeight='medium' icon={<CloseIcon />} onClick={handleDisconnect} color='red.500'>
        {translate('plugins.walletConnectToDapps.header.menu.disconnect')}
      </MenuItem>
    </>
  )
}
