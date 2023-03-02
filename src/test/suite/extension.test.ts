import * as assert from "assert";

import * as vscode from "vscode";
import * as drone from "drone-node";
import { ServersProvider } from "../../servers";
import { ReposProvider } from "../../repos";
import { BuildsProvider } from "../../builds";

suite("Extension Test Suite", () => {
  let extensionContext: vscode.ExtensionContext;
  let serversProvider: ServersProvider;
  let reposProvider: ReposProvider;
  let buildsProvider: BuildsProvider;
  let client: any;

  suiteSetup(async () => {
    await vscode.extensions.getExtension("maximtrp.drone-ci")?.activate();
    extensionContext = (global as any).testExtensionContext;
    client = new drone.Client({ url: process.env.DRONE_SERVER, token: process.env.DRONE_TOKEN });
  });

  test("Test Servers Provider", async () => {
    serversProvider = new ServersProvider(extensionContext);
    vscode.window.registerTreeDataProvider("drone-ci-servers", serversProvider);

    assert.ok(serversProvider.servers.length >= 0);
  });

  test("Test Repos Provider", async () => {
    // Initializing
    reposProvider = new ReposProvider();
    vscode.window.registerTreeDataProvider("drone-ci-builds", reposProvider);

    // Getting repos
    reposProvider.refresh(client);
    let repos = await reposProvider.getChildren();

    assert.ok(repos.length > 0);
  });

  test("Test Builds Provider", async () => {
    // Initializing
    buildsProvider = new BuildsProvider();
    vscode.window.registerTreeDataProvider("drone-ci-repos", buildsProvider);

    // Getting builds
    const [owner, repo] = (process.env.DRONE_TESTREPO || "").split("/");
    buildsProvider.refresh(client, { owner, repo });
    let builds = await buildsProvider.getChildren();

    assert.ok(builds.length > 0);
  });
});
