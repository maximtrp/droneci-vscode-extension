import * as vscode from "vscode";
import * as drone from "drone-node";
import { ServersProvider, Server } from "./servers";
import { BuildsProvider } from "./builds";
import { SecretsProvider } from "./secrets";
import { ReposProvider, Repo } from "./repos";
import { CronsProvider } from "./crons";

export function activate(context: vscode.ExtensionContext) {
  let droneClient: any;

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

  serversTree.onDidChangeSelection((serversView: vscode.TreeViewSelectionChangeEvent<Server>) => {
    if (serversView.selection.length > 0) {
      droneClient = new drone.Client({
        url: serversView.selection[0].url,
        token: serversView.selection[0].token,
      });
      reposProvider.refresh(droneClient);
      vscode.commands.executeCommand("setContext", "hasRepoSelected", false);
      vscode.commands.executeCommand("setContext", "hasServerSelected", true);
    } else {
      vscode.commands.executeCommand("setContext", "hasRepoSelected", false);
      vscode.commands.executeCommand("setContext", "hasServerSelected", false);
    }
  });

  const reposTree = vscode.window.createTreeView("drone-ci-repos", {
    treeDataProvider: reposProvider,
  });

  reposTree.onDidChangeSelection((repoView: vscode.TreeViewSelectionChangeEvent<Repo>) => {
    if (repoView.selection.length > 0 && droneClient) {
      const repo = repoView.selection[0];
      if (repo.name && repo.owner) {
        const repoInfo = { owner: repo.owner, repo: repo.name };
        buildsProvider.refresh(droneClient, repoInfo);
        secretsProvider.refresh(droneClient, repoInfo);
        cronsProvider.refresh(droneClient, repoInfo);
        vscode.commands.executeCommand("setContext", "hasRepoSelected", true);
      }
    } else {
      vscode.commands.executeCommand("setContext", "hasRepoSelected", false);
    }
  });

  // COMMANDS
  vscode.commands.registerCommand("drone-ci.addSecret", () => secretsProvider.addSecret());
  vscode.commands.registerCommand("drone-ci.editSecret", (secret) => secretsProvider.editSecret(secret));
  vscode.commands.registerCommand("drone-ci.addServer", () => serversProvider.addServer());
  vscode.commands.registerCommand("drone-ci.editServer", (server) => serversProvider.editServer(server));
  vscode.commands.registerCommand("drone-ci.addCron", () => cronsProvider.addCron());
  vscode.commands.registerCommand("drone-ci.editCron", (cron) => cronsProvider.editCron(cron));
  vscode.commands.registerCommand("drone-ci.triggerBuild", () => buildsProvider.triggerBuild());
  vscode.commands.registerCommand("drone-ci.disableRepo", (repo) => reposProvider.disableRepo(repo));
  vscode.commands.registerCommand("drone-ci.enableRepo", (repo) => reposProvider.enableRepo(repo));
  vscode.commands.registerCommand("drone-ci.repairRepo", (repo) => reposProvider.repairRepo(repo));
  // vscode.commands.registerCommand("drone-ci.updateRepo", (repo) => reposProvider.updateRepo(repo));
  vscode.commands.registerCommand("drone-ci.promoteBuild", (build) => buildsProvider.promoteBuild(build));
  vscode.commands.registerCommand("drone-ci.cancelBuild", (build) => buildsProvider.cancelBuild(build));
  vscode.commands.registerCommand("drone-ci.restartBuild", (build) => buildsProvider.restartBuild(build));
  vscode.commands.registerCommand("drone-ci.refreshBuilds", () => buildsProvider.refresh());
  vscode.commands.registerCommand("drone-ci.loadMoreBuilds", () => buildsProvider.loadMore());
  vscode.commands.registerCommand("drone-ci.refreshRepos", () => reposProvider.refresh());
  vscode.commands.registerCommand("drone-ci.refreshSecrets", () => secretsProvider.refresh());
  vscode.commands.registerCommand("drone-ci.refreshCrons", () => cronsProvider.refresh());
  vscode.commands.registerCommand("drone-ci.gotoSecretsPage", () => secretsProvider.gotoSecretsPage());
  vscode.commands.registerCommand("drone-ci.gotoCronPage", () => cronsProvider.gotoCronPage());
  vscode.commands.registerCommand("drone-ci.viewBuildStepLog", async (step) => buildsProvider.viewStepLog(step));
  vscode.commands.registerCommand("drone-ci.viewBuildInfo", async (build) => buildsProvider.viewBuildInfo(build));
  vscode.commands.registerCommand("drone-ci.gotoServer", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.url));
  });
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
  vscode.commands.registerCommand("drone-ci.deleteServer", (server) => {
    vscode.window
      .showInformationMessage("Are you sure you want to delete this server?", "Yes", "No")
      .then(async (answer) => {
        if (answer === "Yes") {
          await serversProvider.deleteServer(server);
          if (
            serversProvider.servers.length === 0 ||
            (serversTree.selection.length > 0 && server.label === serversTree.selection[0].label)
          ) {
            droneClient = null;
            buildsProvider.refresh(null, null);
            cronsProvider.refresh(null, null);
            secretsProvider.refresh(null, null);
            reposProvider.refresh(null);
            vscode.commands.executeCommand("setContext", "hasServerSelected", false);
            vscode.commands.executeCommand("setContext", "hasRepoSelected", false);
          }
        }
      });
  });

  vscode.commands.registerCommand("drone-ci.deleteSecret", (secret) => {
    vscode.window.showInformationMessage("Are you sure you want to delete this secret?", "Yes", "No").then((answer) => {
      if (answer === "Yes") {
        secretsProvider.deleteSecret(secret);
      }
    });
  });

  vscode.commands.registerCommand("drone-ci.deleteCron", (cron) => {
    vscode.window
      .showInformationMessage("Are you sure you want to delete this cron job?", "Yes", "No")
      .then((answer) => {
        if (answer === "Yes") {
          cronsProvider.deleteCron(cron);
        }
      });
  });

  vscode.commands.registerCommand("drone-ci.triggerCron", async (cron) => {
    await cronsProvider.triggerCron(cron);
    buildsProvider.refresh();
  });

  context.subscriptions.push(...[serversTree, reposTree]);
  (global as any).testExtensionContext = context;
}

export function deactivate() {}
