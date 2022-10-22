import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'

import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { TransactionId } from './TransactionDetails/TransactionId'
import { Transfers } from './TransactionDetails/Transfers'
import { TxGrid } from './TransactionDetails/TxGrid'
import { TransactionGenericRow } from './TransactionGenericRow'
import type { TransactionRowProps } from './TransactionRow'
import { getDisplayTransfers, getPairDisplayTransfers } from './utils'

export const TransactionReceive = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  toggleOpen,
  isOpen,
  parentWidth,
}: TransactionRowProps) => {
  const displayTransfers = useMemo(
    () => getDisplayTransfers(txDetails.transfers, [TransferType.Receive]),
    [txDetails.transfers],
  )

  return (
    <>
      <TransactionGenericRow
        type={txDetails.type}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        blockTime={txDetails.tx.blockTime}
        displayTransfers={displayTransfers}
        fee={txDetails.fee}
        explorerTxLink={txDetails.explorerTxLink}
        txid={txDetails.tx.txid}
        showDateAndGuide={showDateAndGuide}
        parentWidth={parentWidth}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        <Transfers compactMode={compactMode} transfers={txDetails.tx.transfers} />
        <TxGrid compactMode={compactMode}>
          <TransactionId explorerTxLink={txDetails.explorerTxLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          <Row title='minerFee'>
            <Amount
              value={txDetails.fee?.value ?? '0'}
              precision={txDetails.fee?.asset?.precision ?? 0}
              symbol={txDetails.fee?.asset.symbol ?? ''}
            />
          </Row>
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
