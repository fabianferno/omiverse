"use client";
import MainLayout from "@/components/layouts/MainLayout";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import html2canvas from "html2canvas";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSignTypedData,
} from "wagmi";
import { createCreatorClient } from "@zoralabs/protocol-sdk";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MintButton } from "@/components/MintButton";
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        init: () => void;
        ready: () => void;
        expand: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            username?: string;
          };
          hash?: string;
        };
        onEvent: (eventType: string, callback: () => void) => void;
      };
    };
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

async function saveAndGetCID(
  data: any,
  pinataMetadata = { name: "via karma-gap-sdk" }
) {
  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        pinataContent: data,
        pinataMetadata: pinataMetadata,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT_TOKEN}`,
        },
      }
    );
    return res.data.IpfsHash;
  } catch (error) {
    console.log(error);
  }
}

export default function Home() {
  const [userId, setUserId] = useState<string | null>(
    "X1L2QMdDesYN2iWzy0Gu0mmskjY2"
  ); // TODO: Revert
  const nftCaptureRef = useRef<HTMLDivElement>(null);
  const [isPreparingNFT, setIsPreparingNFT] = useState(false);
  const [tokenUri, setTokenUri] = useState("");
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [userAddress, setUserAddress] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);

  const [telegramState, setTelegramState] = useState({
    isAvailable: false,
    userId: null as number | null,
    error: null as string | null,
  });

  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { address: creatorAddress, isConnected } = useAccount();
  const { signTypedData, data: signature } = useSignTypedData();

  useEffect(() => {
    const initTelegram = async () => {
      try {
        // Wait for window to be defined
        if (typeof window === "undefined") {
          setTelegramState((prev) => ({
            ...prev,
            error: "Window not defined",
          }));
          return;
        }

        // Check if Telegram WebApp is available
        if (!window.Telegram?.WebApp) {
          setTelegramState((prev) => ({
            ...prev,
            error: "Telegram WebApp not available",
          }));
          return;
        }

        // Initialize WebApp
        const tg = window.Telegram.WebApp;

        // Initialize WebApp first
        try {
          tg.init();
        } catch (initError) {
          console.log("Init error (non-fatal):", initError);
        }

        // Add a small delay to ensure initialization
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Set ready state
        try {
          tg.ready();
        } catch (readyError) {
          console.log("Ready error (non-fatal):", readyError);
        }

        // Expand the WebApp
        try {
          tg.expand();
        } catch (expandError) {
          console.log("Expand error (non-fatal):", expandError);
        }

        // Log the entire WebApp object for debugging
        console.log("Telegram WebApp:", tg);
        console.log("InitDataUnsafe:", tg.initDataUnsafe);

        // Check if we have user data
        const user = tg.initDataUnsafe?.user;
        if (!user?.id) {
          setTelegramState((prev) => ({
            ...prev,
            error: "No user ID in Telegram data",
          }));
          return;
        }

        // Update Telegram state
        setTelegramState({
          isAvailable: true,
          userId: user.id,
          error: null,
        });

        // Try to get our user ID
        try {
          const response = await axios.get(
            `/api/proxy/telegram-user/${user.id}`
          );

          if (response.data.success) {
            setUserId(response.data.userId);
            fetchAndRenderGraph();
          } else {
            setTelegramState((prev) => ({
              ...prev,
              error: `Backend error: ${response.data.error}`,
            }));
          }
        } catch (error) {
          setTelegramState((prev) => ({
            ...prev,
            error: `API error: ${error}`,
          }));
          console.error("API error:", error);
        }
      } catch (error) {
        setTelegramState((prev) => ({
          ...prev,
          error: `Initialization error: ${error}`,
        }));
        console.error("Telegram init error:", error);
      }
    };

    // Add a small delay before initialization
    setTimeout(initTelegram, 1000);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderGraph = (nodes: any[], edges: any[]) => {
    if (chartRef.current) {
      // Dispose of existing chart instance
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }

      // Create new chart instance
      chartInstance.current = echarts.init(chartRef.current);

      // Ensure unique IDs for nodes
      const uniqueNodes = nodes.reduce((acc: any[], node: any) => {
        if (!acc.find((n: any) => n.id === node.id)) {
          acc.push(node);
        }
        return acc;
      }, []);

      const option = {
        backgroundColor: "#111",
        series: [
          {
            type: "graph",
            roam: true,
            draggable: true,
            zoom: 1,
            layoutAnimation: true,
            cursor: "move",
            layout: "force",
            data: uniqueNodes.map((node) => ({
              id: node.id,
              name: node.label,
              value: node.id,
              fixed: false,
              draggable: true,
              itemStyle: {
                color: getNodeColor(node.type),
                borderColor: "#fff",
                borderWidth: 2,
                shadowColor: getNodeColor(node.type),
                shadowBlur: 20,
              },
              label: {
                show: true,
                color: "#fff",
                fontSize: 14,
                position: "bottom",
                distance: 5,
                formatter: "{b}",
                backgroundColor: "#00000066",
                padding: [4, 8],
                borderRadius: 4,
              },
            })),
            links: edges.map((edge) => ({
              source: edge.source,
              target: edge.target,
              lineStyle: {
                color: "#ffffff50",
                width: 2,
                shadowColor: "#fff",
                shadowBlur: 10,
              },
              label: {
                fontSize: 14,
                show: true,
                color: "#fff",
                formatter: edge.label,
              },
            })),
            force: {
              repulsion: 1500,
              edgeLength: 300,
              friction: 0.3,
              gravity: 0.05,
              layoutAnimation: true,
              initLayout: "force",
            },
            emphasis: {
              focus: "adjacency",
              lineStyle: {
                width: 5,
              },
            },
            edgeSymbolSize: 8,
            edgeSymbol: "arrow",
            symbolSize: 15,
            symbol: "circle",
          },
        ],
      };

      chartInstance.current.setOption(option);

      const handleResize = () => {
        chartInstance.current?.resize();
      };

      window.addEventListener("resize", handleResize);

      // Cleanup function for useEffect
      return () => {
        window.removeEventListener("resize", handleResize);
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: query }]);

    try {
      const response = await axios.get(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL
        }/search?userId=${userId}&query=${encodeURIComponent(query)}`
      );

      const { answer, graphData } = response.data;

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);

      if (graphData) {
        renderGraph(graphData.nodes, graphData.edges);
      }
    } catch (error) {
      console.error("Search error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error while processing your request.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setQuery("");
    }
  };

  const fetchAndRenderGraph = async () => {
    if (!userId) return;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/graph?userId=${userId}`
      );
      const { nodes, edges } = response.data as {
        nodes: {
          id: string;
          label: string;
          type: "PERSON" | "THING" | "EVENT" | "OTHER";
        }[];
        edges: {
          source: string;
          target: string;
          label: string;
        }[];
      };

      renderGraph(nodes, edges);
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  };

  useEffect(() => {
    fetchAndRenderGraph();
  }, [userId]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [userId]);

  const getNodeColor = (type: string) => {
    const colors = {
      PERSON: "#ff4e50",
      THING: "#00ff9f",
      EVENT: "#4b0082",
      OTHER: "#00ffff",
    };
    return colors[type as keyof typeof colors] || colors.OTHER;
  };

  const downloadAsPng = async () => {
    if (!nftCaptureRef.current) return;

    try {
      const canvas = await html2canvas(nftCaptureRef.current, {
        backgroundColor: null,
        scale: 2, // Higher quality
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "knowledge-graph.png";
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
    }
  };

  const prepareNFT = async () => {
    if (!nftCaptureRef.current) return;
    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      setAddressError("Please enter a valid Ethereum address");
      return;
    }

    setIsPreparingNFT(true);
    try {
      // Generate canvas from the chart
      const canvas = await html2canvas(nftCaptureRef.current, {
        backgroundColor: null,
        scale: 2, // Higher quality
      });

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, "image/png");
      });

      // Create file from blob
      const file = new File([blob], "knowledge-graph.png", {
        type: "image/png",
      });

      // Upload to IPFS
      const imageUri = await saveAndGetCID(file);

      // Create metadata
      const metadata = {
        name: "Knowledge Graph NFT",
        description: "A visualization of connected knowledge",
        image: imageUri,
        attributes: [],
      };

      // Upload metadata to IPFS
      const metadataUri = await saveAndGetCID(metadata);
      const tokenUri = `ipfs://${metadataUri}`;
      console.log(tokenUri);

      setTokenUri(tokenUri);
    } catch (error) {
      console.error("Minting error:", error);
    } finally {
      setIsPreparingNFT(false);
    }
  };

  return (
    <MainLayout>
      <div className="text-center">
        <section ref={nftCaptureRef}>
          <div
            ref={chartRef}
            className="w-full h-[600px] rounded-lg border border-zinc-800"
          />
        </section>
        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <input
              type="text"
              placeholder="Enter recipient address for NFT"
              value={userAddress}
              onChange={(e) => {
                setUserAddress(e.target.value);
                setAddressError(null);
              }}
              className="w-96 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-600"
            />
            {addressError && (
              <div className="text-red-500 text-sm">{addressError}</div>
            )}
          </div>
          <div className="flex justify-center gap-4">
            {/* {!isConnected && !publicClient ? (
              <ConnectButton />
            ) : ( */}
            <div>
              {tokenUri ? (
                <MintButton tokenUri={tokenUri} userAddress={userAddress} />
              ) : (
                <button
                  onClick={prepareNFT}
                  disabled={isPreparingNFT || !userAddress}
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
                  {isPreparingNFT ? "Preparing..." : "Prepare to NFT"}
                </button>
              )}
            </div>
            {/* )} */}

            <button
              onClick={downloadAsPng}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition-colors"
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Download as PNG
            </button>
          </div>
        </div>
        <div className="mt-8 mx-auto">
          <div className="bg-zinc-900 rounded-lg mb-4 p-4 h-[300px] overflow-y-auto text-left">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "border border-teal-600"
                      : "bg-zinc-700"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2 bg-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-2 font-bold bg-teal-700 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
