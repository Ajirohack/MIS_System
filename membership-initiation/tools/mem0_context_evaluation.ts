import axios from "axios";
import * as fs from "fs";
import * as path from "path";

/**
 * This tool evaluates mem0.ai's context provision capabilities
 * for use with the SpaceNew cross-platform system.
 */

// Configuration
const MEM0_API_KEY = process.env.MEM0_API_KEY || "your-api-key";
const MEM0_API_URL = "https://api.mem0.ai/v1";
const TEST_DATA_DIR = path.join(__dirname, "../test-data");

// Sample data for context testing
interface TestCase {
  name: string;
  input: string;
  expectedContext: string[];
  tags: string[];
}

const testCases: TestCase[] = [
  {
    name: "Cross-Platform Authentication",
    input:
      "How does authentication work across different platforms in SpaceNew?",
    expectedContext: ["authentication", "cross-platform", "security"],
    tags: ["technical", "security"],
  },
  {
    name: "Platform Connection Flow",
    input: "Show me the steps to connect the mobile app to my account",
    expectedContext: ["mobile-app", "connection", "QR code"],
    tags: ["user-flow", "mobile"],
  },
  {
    name: "Telegram Bot Commands",
    input: "What commands can I use with the Telegram bot?",
    expectedContext: ["telegram-bot", "commands", "messaging"],
    tags: ["telegram", "interface"],
  },
  {
    name: "Data Synchronization",
    input: "Is my data synced between the web app and browser extension?",
    expectedContext: ["synchronization", "web", "browser-extension", "data"],
    tags: ["data", "synchronization"],
  },
  {
    name: "Security Question",
    input: "How secure is the platform connection between devices?",
    expectedContext: ["security", "encryption", "connection"],
    tags: ["security", "privacy"],
  },
];

/**
 * Send a query to mem0.ai and evaluate the returned context
 */
async function evaluateMem0Context(
  query: string,
  expectedContext: string[]
): Promise<{
  relevanceScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  responseTime: number;
  rawResponse: any;
}> {
  const startTime = Date.now();

  try {
    const response = await axios.post(
      `${MEM0_API_URL}/query`,
      {
        query,
        max_results: 5,
      },
      {
        headers: {
          Authorization: `Bearer ${MEM0_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const responseTime = Date.now() - startTime;
    const results = response.data.results || [];

    // Extract content from results
    const retrievedContent = results
      .map((r: any) => r.content)
      .join(" ")
      .toLowerCase();

    // Check how many expected keywords are found in the response
    const matchedKeywords = expectedContext.filter((keyword) =>
      retrievedContent.includes(keyword.toLowerCase())
    );

    const missingKeywords = expectedContext.filter(
      (keyword) => !retrievedContent.includes(keyword.toLowerCase())
    );

    // Calculate relevance score (percentage of expected keywords found)
    const relevanceScore =
      (matchedKeywords.length / expectedContext.length) * 100;

    return {
      relevanceScore,
      matchedKeywords,
      missingKeywords,
      responseTime,
      rawResponse: response.data,
    };
  } catch (error) {
    console.error("Error querying mem0.ai:", error);
    return {
      relevanceScore: 0,
      matchedKeywords: [],
      missingKeywords: expectedContext,
      responseTime: Date.now() - startTime,
      rawResponse: null,
    };
  }
}

/**
 * Run all test cases and generate a report
 */
async function runEvaluation(): Promise<void> {
  console.log("Starting mem0.ai context evaluation...");

  const results = [];
  let totalScore = 0;
  let totalResponseTime = 0;

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    const evaluation = await evaluateMem0Context(
      testCase.input,
      testCase.expectedContext
    );

    results.push({
      testCase,
      evaluation,
    });

    totalScore += evaluation.relevanceScore;
    totalResponseTime += evaluation.responseTime;

    console.log(`  Relevance Score: ${evaluation.relevanceScore.toFixed(2)}%`);
    console.log(`  Response Time: ${evaluation.responseTime}ms`);
    console.log(`  Matched Keywords: ${evaluation.matchedKeywords.join(", ")}`);
    console.log(`  Missing Keywords: ${evaluation.missingKeywords.join(", ")}`);
    console.log("-----------------------------------");
  }

  const averageScore = totalScore / testCases.length;
  const averageResponseTime = totalResponseTime / testCases.length;

  const report = {
    summary: {
      totalTestCases: testCases.length,
      averageRelevanceScore: averageScore,
      averageResponseTime: averageResponseTime,
      timestamp: new Date().toISOString(),
    },
    detailedResults: results,
  };

  // Ensure directory exists
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  // Save report to file
  fs.writeFileSync(
    path.join(TEST_DATA_DIR, `mem0_evaluation_${Date.now()}.json`),
    JSON.stringify(report, null, 2)
  );

  console.log("\nEvaluation Complete");
  console.log(`Average Relevance Score: ${averageScore.toFixed(2)}%`);
  console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
  console.log(`Report saved to test-data directory`);
}

/**
 * Main execution
 */
if (require.main === module) {
  runEvaluation().catch((err) => {
    console.error("Evaluation failed:", err);
    process.exit(1);
  });
}

// Export for testing/importing
export { evaluateMem0Context, runEvaluation, testCases };
