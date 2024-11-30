"use client";
import { createCreatorClient } from "@zoralabs/protocol-sdk";
import { useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { zoraSepolia } from "viem/chains";

interface MintButtonProps {
  tokenUri: string;
  userAddress: string;
}

// Replace with your private key
const PRIVATE_KEY = process.env.NEXT_PUBLIC_PRIVATE_KEY || "";
// Replace with your preferred RPC URL

type MintData = {
  parameters: any;
  contractAddress: `0x${string}`;
};

export function MintButton({ tokenUri, userAddress }: MintButtonProps) {
  const [mintData, setMintData] = useState<MintData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chainId = 999999999;

  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Create a wallet client using the private key
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account: account,
    transport: http(),
    chain: zoraSepolia,
  });

  const publicClient = createPublicClient({
    chain: zoraSepolia,
    transport: http(),
  }) as PublicClient;

  async function handleMint() {
    if (!userAddress || !publicClient) {
      setError("Please provide a valid wallet address.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const creatorClient = createCreatorClient({ chainId, publicClient });
      const { parameters, contractAddress } = await creatorClient.create1155({
        contract: {
          name: "Knowledge Graph Collection",
          uri: tokenUri,
        },
        token: {
          tokenMetadataURI: tokenUri,
        },
        account: userAddress as `0x${string}`,
      });

      setMintData({ parameters, contractAddress });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create premint");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWriteContract() {
    if (!mintData) {
      setError("Minting parameters are not available.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const txHash = await walletClient.sendTransaction({
        to: mintData.contractAddress,
        data: mintData.parameters.data,
        value: BigInt(0),
        gas: BigInt(1000000),
      });

      setTxHash(txHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mint NFT.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (publicClient && chainId && tokenUri && !mintData) {
      handleMint();
    }
  }, [publicClient, chainId, tokenUri]);

  if (error) {
    return <div className="text-red-500 text-center py-2">{error}</div>;
  }

  if (txHash) {
    return (
      <div className="text-center py-2">
        <div className="text-green-500 mb-2">NFT minted successfully!</div>
        <a
          href={`https://sepolia.explorer.zora.energy/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-400 hover:text-zinc-300 underline"
        >
          View transaction
        </a>
      </div>
    );
  }

  return (
    <div>
      {!mintData || isLoading ? (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-200 mr-3" />
          {isLoading ? "Minting NFT..." : "Setting up NFT..."}
        </div>
      ) : (
        <button
          onClick={handleWriteContract}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Mint as NFT
        </button>
      )}
    </div>
  );
}
