// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as drone from "drone-node";
import { ServersProvider, Server } from "./servers";
import { BuildsProvider } from "./builds";
import { SecretsProvider } from "./secrets";
import { ReposProvider, Repo } from "./repos";
import { CronsProvider } from "./crons";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let droneClient: any;
  let selectedRepoOwner: string;
  let selectedRepoName: string;

  const serversProvider = new ServersProvider(context);
  vscode.window.registerTreeDataProvider("drone-ci-servers", serversProvider);

  const buildsProvider = new BuildsProvider();
  vscode.window.registerTreeDataProvider("drone-ci-builds", buildsProvider);

  const reposProvider = new ReposProvider();
  vscode.window.registerTreeDataProvider("drone-ci-repos", reposProvider);

  const secretsProvider = new SecretsProvider();
  vscode.window.registerTreeDataProvider("drone-ci-secrets", secretsProvider);

  const cronsProvider = new CronsProvider();
  vscode.window.registerTreeDataProvider("drone-ci-cron", cronsProvider);

  const serversTree = vscode.window.createTreeView("drone-ci-servers", {
    treeDataProvider: serversProvider,
  });

  serversTree.onDidChangeSelection((servers: vscode.TreeViewSelectionChangeEvent<Server>) => {
    droneClient = new drone.Client({
      url: servers.selection[0].url,
      token: servers.selection[0].token,
    });
    reposProvider.refresh(droneClient);
  });

  const reposTree = vscode.window.createTreeView("drone-ci-repos", {
    treeDataProvider: reposProvider,
  });

  reposTree.onDidChangeSelection((repoView: vscode.TreeViewSelectionChangeEvent<Repo>) => {
    const repoName = repoView.selection[0].label;
    if (repoName) {
      [selectedRepoOwner, selectedRepoName] = repoName.toString().split("/");
      const repoInfo = { owner: selectedRepoOwner, repo: selectedRepoName };
      buildsProvider.refresh(droneClient, repoInfo);
      secretsProvider.refresh(droneClient, repoInfo);
      cronsProvider.refresh(droneClient, repoInfo);
    }
  });

  // COMMANDS
  vscode.commands.registerCommand("drone-ci.addServer", () => serversProvider.addServer());
  vscode.commands.registerCommand("drone-ci.deleteServer", (server) => {
    vscode.window.showInformationMessage("Are you sure you want to delete this server?", "Yes", "No").then((answer) => {
      if (answer === "Yes") {
        serversProvider.deleteServer(server);
      }
    });
  });
  vscode.commands.registerCommand("drone-ci.gotoServer", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.url));
  });

  vscode.commands.registerCommand("drone-ci.addSecret", () => secretsProvider.addSecret());
  vscode.commands.registerCommand("drone-ci.editSecret", (secret) => secretsProvider.editSecret(secret));
  vscode.commands.registerCommand("drone-ci.deleteSecret", (secret) => {
    vscode.window.showInformationMessage("Are you sure you want to delete this secret?", "Yes", "No").then((answer) => {
      if (answer === "Yes") {
        secretsProvider.deleteSecret(secret);
      }
    });
  });

  vscode.commands.registerCommand("drone-ci.refreshBuilds", () => buildsProvider.refresh());
  vscode.commands.registerCommand("drone-ci.refreshRepos", () => reposProvider.refresh());
  vscode.commands.registerCommand("drone-ci.refreshSecrets", () => secretsProvider.refresh());
  vscode.commands.registerCommand("drone-ci.refreshCrons", () => cronsProvider.refresh());

  vscode.commands.registerCommand("drone-ci.gotoRepoPage", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.url));
  });
  vscode.commands.registerCommand("drone-ci.gotoRepoBranchesPage", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.branchesURL));
  });
  vscode.commands.registerCommand("drone-ci.gotoRepoDeploymentsPage", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.deploymentsURL));
  });
  vscode.commands.registerCommand("drone-ci.gotoRepoSettingsPage", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.settingsURL));
  });
  vscode.commands.registerCommand("drone-ci.gotoGitRepoPage", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.gitURL));
  });
  vscode.commands.registerCommand("drone-ci.gotoBuildPage", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.url));
  });
  vscode.commands.registerCommand("drone-ci.gotoBuildComparePage", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.url));
  });

  vscode.commands.registerCommand("drone-ci.gotoSecretsPage", () => secretsProvider.gotoSecretsPage());
  vscode.commands.registerCommand("drone-ci.gotoCronPage", () => cronsProvider.gotoCronPage());
  vscode.commands.registerCommand("drone-ci.viewBuildStepLog", async (step) => buildsProvider.viewStepLog(step));
  vscode.commands.registerCommand("drone-ci.viewBuildInfo", async (build) => buildsProvider.viewBuildInfo(build));

  context.subscriptions.push(...[serversTree, reposTree]);
  (global as any).testExtensionContext = context;
}

// This method is called when your extension is deactivated
export function deactivate() {}
