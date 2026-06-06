/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MistakeBookItem } from "../types";

// Leitner system intervals in days
const INTERVALS = [1, 3, 7, 14, 30];

export function calculateNextReview(currentBox: number, isCorrect: boolean): { box: number, nextReview: string } {
    let newBox = currentBox;
    if (isCorrect) {
        newBox = Math.min(newBox + 1, 5); // Box 1 to 5
    } else {
        newBox = Math.max(newBox - 1, 1); // Box 1 to 5
    }
    
    // Calculate next review date
    const date = new Date();
    const daysToAdd = INTERVALS[newBox - 1] || 1;
    date.setDate(date.getDate() + daysToAdd);
    
    return {
        box: newBox,
        nextReview: date.toISOString()
    };
}
