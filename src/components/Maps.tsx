"use client";

import dynamic from "next/dynamic";

const loading = () => <div className="h-56 w-full animate-pulse rounded-xl bg-line/50" />;

export const FeedMap = dynamic(() => import("./FeedMap"), { ssr: false, loading });
export const AreaMap = dynamic(() => import("./AreaMap"), { ssr: false, loading });
