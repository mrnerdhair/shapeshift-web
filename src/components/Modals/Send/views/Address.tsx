import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  FormControl,
  FormLabel,
  IconButton,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Stack,
} from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import get from 'lodash/get'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { YatBanner } from 'components/Banners/YatBanner'
import { SelectAssetRoutes } from 'components/SelectAssets/SelectAssetCommon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { parseAddressInput } from 'lib/address/address'
import { logger } from 'lib/logger'

import { AddressInput } from '../AddressInput/AddressInput'
import type { SendInput } from '../Form'
import { SendFormFields, SendRoutes } from '../SendCommon'

const moduleLogger = logger.child({
  namespace: ['SendAddress'],
})

export const Address = () => {
  moduleLogger.info('Address1')
  const [isValidating, setIsValidating] = useState(false)
  const history = useHistory()
  const translate = useTranslate()
  const {
    setValue,
    formState: { errors },
  } = useFormContext<SendInput>()
  const address = useWatch<SendInput, SendFormFields.Address>({ name: SendFormFields.Address })
  const input = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })
  const { send } = useModal()
  const asset = useWatch<SendInput, SendFormFields.Asset>({ name: SendFormFields.Asset })
  const isYatFeatureEnabled = useFeatureFlag('Yat')
  moduleLogger.info('Address2')
  if (!asset) return null
  const { chainId } = asset
  const isYatSupportedChain = chainId === ethChainId // yat only supports eth mainnet
  const handleNext = () => history.push(SendRoutes.Details)
  const addressError = get(errors, `${SendFormFields.Input}.message`, null)
  moduleLogger.info('Address3')
  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label={translate('common.back')}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={() =>
          history.push(SendRoutes.Select, {
            toRoute: SelectAssetRoutes.Search,
            assetId: asset.assetId,
          })
        }
      />
      <ModalHeader textAlign='center'>
        {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
      </ModalHeader>
      <ModalCloseButton borderRadius='full' />
      <ModalBody>
        <FormControl>
          <FormLabel color='gray.500' w='full'>
            {translate('modals.send.sendForm.sendTo')}
          </FormLabel>
          <AddressInput
            rules={{
              required: true,
              validate: {
                validateAddress: async (rawInput: string) => {
                  moduleLogger.info('validateAddress1')
                  const value = rawInput.trim() // trim leading/trailing spaces
                  // clear previous values
                  moduleLogger.info('validateAddress1.1')
                  setValue(SendFormFields.Address, '')
                  moduleLogger.info('validateAddress1.2')
                  setValue(SendFormFields.VanityAddress, '')
                  moduleLogger.info('validateAddress1.3')
                  setIsValidating(true)
                  moduleLogger.info('validateAddress1.4')
                  // this does not throw, everything inside is handled
                  const { address, vanityAddress } = await parseAddressInput({ chainId, value })
                  moduleLogger.info('validateAddress1.5')
                  setIsValidating(false)
                  moduleLogger.info('validateAddress2')
                  // set returned values
                  setValue(SendFormFields.Address, address)
                  setValue(SendFormFields.VanityAddress, vanityAddress)
                  const invalidMessage =
                    isYatFeatureEnabled && isYatSupportedChain
                      ? 'common.invalidAddressOrYat'
                      : 'common.invalidAddress'
                  moduleLogger.info('validateAddress3: ', address)
                  return address ? true : invalidMessage
                },
              },
            }}
          />
        </FormControl>
        {isYatFeatureEnabled && isYatSupportedChain && <YatBanner mt={6} />}
      </ModalBody>
      <ModalFooter {...(isYatFeatureEnabled && { display: 'flex', flexDir: 'column' })}>
        <Stack flex={1} {...(isYatFeatureEnabled && { w: 'full' })}>
          <Button
            width='full'
            isDisabled={!address || !input || addressError}
            isLoading={isValidating}
            colorScheme={addressError && !isValidating ? 'red' : 'blue'}
            size='lg'
            onClick={handleNext}
            data-test='send-address-next-button'
          >
            <Text translation={addressError || 'common.next'} />
          </Button>
          <Button width='full' variant='ghost' size='lg' mr={3} onClick={() => send.close()}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
