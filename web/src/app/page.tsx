"use client";
import { useAccount } from "wagmi";
import MainLayout from "@/components/layouts/MainLayout";
import axios from "axios";
import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export default function Home() {
  const { address } = useAccount();
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAndRenderGraph = async () => {
      try {
        const response = await axios.get(
          "http://localhost:4000/graph?userId=X1L2QMdDesYN2iWzy0Gu0mmskjY2"
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

        if (chartRef.current) {
          const chart = echarts.init(chartRef.current);

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
                data: nodes.map((node) => ({
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
                  repulsion: 1000,
                  edgeLength: 300,
                  friction: 0.6,
                  gravity: 0.1,
                  layoutAnimation: true,
                  initLayout: "force",
                },
                emphasis: {
                  focus: "adjacency",
                  lineStyle: {
                    width: 5,
                  },
                },
              },
            ],
          };

          chart.setOption(option);

          // Handle resize
          window.addEventListener("resize", () => {
            chart.resize();
          });
        }
      } catch (error) {
        console.error("Error fetching graph data:", error);
      }
    };

    fetchAndRenderGraph();
  }, []);

  const getNodeColor = (type: string) => {
    const colors = {
      PERSON: "#ff4e50",
      THING: "#00ff9f",
      EVENT: "#4b0082",
      OTHER: "#00ffff",
    };
    return colors[type as keyof typeof colors] || colors.OTHER;
  };

  return (
    <MainLayout>
      <div className="text-center">
        {address ? (
          <>
            <div className="mb-8">{`Hello World, ${address}`}</div>
            <div
              ref={chartRef}
              className="w-full h-[600px] rounded-lg border border-gray-800"
            />
          </>
        ) : (
          <div className="text-2xl">Connect your wallet to get started</div>
        )}
      </div>
    </MainLayout>
  );
}
