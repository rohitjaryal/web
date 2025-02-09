import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import type {
  EvmTransactionRequest,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgsEvm,
  SwapErrorRight,
  SwapperApi,
  TradeQuote,
} from 'lib/swapper/types'
import { checkEvmSwapStatus } from 'lib/utils/evm'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { fetchOneInchSwap } from './utils/fetchOneInchSwap'

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const oneInchApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input as GetEvmTradeQuoteInput)

    return tradeQuoteResult.map(tradeQuote => {
      const id = uuid()
      const firstHop = tradeQuote.steps[0]
      tradeQuoteMetadata.set(id, { chainId: firstHop.sellAsset.chainId as EvmChainId })
      return [tradeQuote]
    })
  },

  getUnsignedTxEvm: async ({
    chainId,
    from,
    nonce,
    slippageTolerancePercentageDecimal,
    stepIndex,
    tradeQuote,
  }: GetUnsignedTxArgsEvm): Promise<EvmTransactionRequest> => {
    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]

    const { receiveAddress, affiliateBps } = tradeQuote

    const {
      tx: { value, to, gasPrice, gas, data },
    } = await fetchOneInchSwap({
      affiliateBps,
      buyAsset,
      receiveAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      maximumSlippageDecimalPercentage: slippageTolerancePercentageDecimal,
    })

    return {
      chainId: Number(fromChainId(chainId).chainReference),
      data,
      from,
      gasLimit: gas,
      gasPrice,
      nonce,
      to,
      value,
    }
  },

  checkTradeStatus: checkEvmSwapStatus,
}
