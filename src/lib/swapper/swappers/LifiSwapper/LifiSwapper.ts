import type { AssetId } from '@shapeshiftoss/caip'
import { optimismChainId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import type { BuyAssetBySellIdInput, Swapper } from 'lib/swapper/types'
import { executeEvmTrade } from 'lib/utils/evm'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import {
  filterCrossChainEvmBuyAssetsBySellAssetId,
  filterSameChainEvmBuyAssetsBySellAssetId,
} from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const lifiSwapper: Swapper = {
  executeTrade: executeEvmTrade,

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(filterEvmAssetIdsBySellable(assets).map(asset => asset.assetId))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(
      [
        ...filterCrossChainEvmBuyAssetsBySellAssetId(input),
        // TODO(gomes): This is weird but a temporary product compromise to accomodate for the fact that OP rewards have weird heuristics
        // and would detect same-chain swaps on Li.Fi as cross-chain swaps, making the rewards gameable by same-chain swaps
        // Remove me when OP rewards ends
        ...filterSameChainEvmBuyAssetsBySellAssetId(input).filter(
          asset => asset.chainId !== optimismChainId,
        ),
      ].map(asset => asset.assetId),
    )
  },
}
