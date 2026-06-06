/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  estimatedItemHeight?: number;
  containerHeight?: number | string;
  className?: string;
}

export default function VirtualizedList<T>({
  items,
  renderItem,
  estimatedItemHeight = 90,
  containerHeight = 420,
  className = ""
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Record<number, number>>({});

  // Use a resize observer to measure individual rendered items dynamically
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Reset scroll on items change (e.g. searching/filtering)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items]);

  // Compute accumulated heights and offsets
  const { offsets, totalHeight } = useMemo(() => {
    const offsets: number[] = [];
    let currentOffset = 0;

    for (let i = 0; i < items.length; i++) {
      offsets.push(currentOffset);
      const measured = measuredHeights[i];
      const height = measured !== undefined ? measured : estimatedItemHeight;
      currentOffset += height;
    }

    return { offsets, totalHeight: currentOffset };
  }, [items, measuredHeights, estimatedItemHeight]);

  // Find start and end indices of visible items
  const { startIndex, endIndex } = useMemo(() => {
    const parentHeight = typeof containerHeight === "number" ? containerHeight : 450;
    
    let startIndex = 0;
    let endIndex = 0;

    // Binary search to find start item
    let low = 0;
    let high = offsets.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (offsets[mid] <= scrollTop) {
        startIndex = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Find end item based on container height
    endIndex = startIndex;
    while (endIndex < items.length && offsets[endIndex] < scrollTop + parentHeight) {
      endIndex++;
    }

    // Add buffer of 3 items on top and bottom to prevent flickering
    startIndex = Math.max(0, startIndex - 3);
    endIndex = Math.min(items.length - 1, endIndex + 3);

    return { startIndex, endIndex };
  }, [offsets, scrollTop, containerHeight, items.length]);

  // Visible items checklist
  const visibleItems = useMemo(() => {
    const result: { item: T; index: number; offset: number }[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i] !== undefined) {
        result.push({
          item: items[i],
          index: i,
          offset: offsets[i]
        });
      }
    }
    return result;
  }, [startIndex, endIndex, items, offsets]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto relative ${className}`}
      style={{ height: containerHeight }}
    >
      {/* Scrollable stretch runway to simulate total content size */}
      <div style={{ height: totalHeight, width: "100%", relative: "absolute" }}>
        {visibleItems.map(({ item, index, offset }) => {
          return (
            <div
              key={index}
              ref={(el) => {
                itemRefs.current[index] = el;
                if (el) {
                  const rect = el.getBoundingClientRect();
                  if (measuredHeights[index] !== rect.height && rect.height > 0) {
                    setMeasuredHeights((prev) => ({
                      ...prev,
                      [index]: rect.height
                    }));
                  }
                }
              }}
              style={{
                position: "absolute",
                top: offset,
                left: 0,
                right: 0,
                width: "100%",
                boxSizing: "border-box"
              }}
            >
              {renderItem(item, index, {})}
            </div>
          );
        })}
      </div>
    </div>
  );
}
