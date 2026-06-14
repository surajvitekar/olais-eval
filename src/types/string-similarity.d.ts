declare module "string-similarity" {
  /**
   * Computes the similarity between two strings based on Dice's Coefficient (bigram matching).
   * Returns a number between 0 and 1, where 1 means identical strings.
   */
  export function compareTwoStrings(first: string, second: string): number

  /**
   * Compares a main string against an array of target strings.
   * Returns an object with the best match, best match index, best match rating, and ratings array.
   */
  export function findBestMatch(
    mainString: string,
    targetStrings: string[]
  ): {
    ratings: { target: string; rating: number }[]
    bestMatch: { target: string; rating: number }
    bestMatchIndex: number
  }
}
