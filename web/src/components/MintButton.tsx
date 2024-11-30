"use client";
import { createCreatorClient } from "@zoralabs/protocol-sdk";
import { useAccount, useChainId, usePublicClient, useSignTypedData, useWriteContract } from "wagmi";
import { useEffect, useState } from "react";

interface MintButtonProps {
    tokenUri: string;
}


type MintData = {
    parameters: any,
    contractAddress: `0x${string}`
}

export function MintButton({ tokenUri }: MintButtonProps) {
    const [mintData, setMintData] = useState<MintData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const chainId = useChainId();
    const publicClient = usePublicClient();
    const { address: creatorAddress } = useAccount();
    const [isLoading, setIsLoading] = useState(false);
    const { writeContract, isPending, isSuccess, data } = useWriteContract()
    const [txHash, setTxHash] = useState<string | null>(null);

    async function handleMint() {
        if (!creatorAddress || !publicClient) return;

        try {
            setIsLoading(true);
            setError(null);

            const creatorClient = createCreatorClient({ chainId, publicClient });
            const {
                parameters,
                contractAddress
            } = await creatorClient.create1155({
                contract: {
                    name: "Knowledge Graph Collection",
                    uri: tokenUri,
                },
                token: {
                    tokenMetadataURI: tokenUri,
                },
                account: creatorAddress!,
            });

            setMintData({
                parameters,
                contractAddress,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create premint');
        } finally {
            setIsLoading(false);
        }
    }



    useEffect(() => {
        if (creatorAddress && publicClient && chainId && tokenUri && !mintData) {
            handleMint();
        }
    }, [creatorAddress, publicClient, chainId, tokenUri]);

    useEffect(() => {
        if (isSuccess && data) {
            setTxHash(data);
        }
    }, [isSuccess, data]);

    if (error) {
        return (
            <div className="text-red-500 text-center py-2">
                {error}
            </div>
        );
    }

    if (txHash) {
        return (
            <div className="text-center py-2">
                <div className="text-green-500 mb-2">NFT minted successfully!</div>
                <a
                    href={`https://999999999.testnet.routescan.io/tx/${txHash}`}
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
            {!mintData || isPending ? (
                <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-200 mr-3" />
                    {isPending ? "Minting NFT..." : "Setting up NFT..."}
                </div>
            ) : (
                <button
                    onClick={() => {
                        writeContract(mintData.parameters)
                    }}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mint as NFT
                </button>
            )}
        </div>
    );
} 