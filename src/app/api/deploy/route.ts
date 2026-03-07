import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    // Run the deploy script on the server
    const { exec } = require("child_process");
    const result = await new Promise<string>((resolve, reject) => {
      exec(
        "/opt/plan-app-deploy/deploy.sh",
        { timeout: 90000, cwd: "/opt/plan-app-deploy" },
        (error: any, stdout: string, stderr: string) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout);
          }
        }
      );
    });
    return NextResponse.json({ success: true, output: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
