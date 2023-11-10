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

  const serversTree = vscode.window.createTreeView<Server>("drone-ci-servers", {
    treeDataProvider: serversProvider,
  });

  serversTree.onDidChangeSelection(
    async (serversView: vscode.TreeViewSelectionChangeEvent<Server>) => {
      if (serversView.selection.length > 0) {
        droneClient = new drone.Client({
          url: serversView.selection[0].url,
          token: serversView.selection[0].token,
        });
        reposProvider.reset().setClient(droneClient).refresh();
        buildsProvider.reset().setClient(droneClient).refresh();
        secretsProvider.reset().setClient(droneClient).refresh();
        cronsProvider.reset().setClient(droneClient).refresh();
        vscode.commands.executeCommand("setContext", "hasRepoSelected", false);

        const repos = await reposProvider.getChildren();
        if (repos[0] instanceof Repo) {
          reposTree.reveal(repos[0], { select: true, focus: true });
          vscode.commands.executeCommand("setContext", "hasRepoSelected", true);
        }
        vscode.commands.executeCommand("setContext", "hasServerSelected", true);
      } else {
        vscode.commands.executeCommand("setContext", "hasRepoSelected", false);
        vscode.commands.executeCommand("setContext", "hasServerSelected", false);
      }
    }
  );

  serversProvider.getServers().then(() => {
    const server = serversProvider.getFirst();
    if (server) {
      serversTree.reveal(server, { select: true, focus: true });
      vscode.commands.executeCommand("setContext", "hasServerSelected", true);
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
        buildsProvider.setClient(droneClient).setData(repoInfo).refresh();
        secretsProvider.setClient(droneClient).setData(repoInfo).refresh();
        cronsProvider.setClient(droneClient).setData(repoInfo).refresh();
        vscode.commands.executeCommand("setContext", "hasRepoSelected", true);
      }
    } else {
      vscode.commands.executeCommand("setContext", "hasRepoSelected", false);
    }
  });

  // COMMANDS
  const commandAddSecret = vscode.commands.registerCommand("drone-ci.addSecret", () =>
    secretsProvider.addSecret()
  );
  const commandEditSecret = vscode.commands.registerCommand("drone-ci.editSecret", (secret) =>
    secretsProvider.editSecret(secret)
  );
  const commandAddServer = vscode.commands.registerCommand("drone-ci.addServer", async () => {
    await serversProvider.addServer();
    if (serversTree.selection.length == 0) {
      const server = serversProvider.getLast();
      if (server) {
        serversTree.reveal(server, { select: true, focus: true });
      }
    }
  });
  const commandEditServer = vscode.commands.registerCommand(
    "drone-ci.editServer",
    async (server) => {
      const serverSelected = serversTree.selection[0];
      const serverNew = await serversProvider.editServer(server);

      if (serverNew && serverSelected.url === server.url) {
        droneClient = new drone.Client({
          url: serverNew.url,
          token: serverNew.token,
        });
        reposProvider.reset().setClient(droneClient).refresh();
        buildsProvider.reset().setClient(droneClient).refresh();
        secretsProvider.reset().setClient(droneClient).refresh();
        cronsProvider.reset().setClient(droneClient).refresh();
      }
    }
  );
  const commandAddCron = vscode.commands.registerCommand("drone-ci.addCron", () =>
    cronsProvider.addCron()
  );
  const commandEditCron = vscode.commands.registerCommand("drone-ci.editCron", (cron) =>
    cronsProvider.editCron(cron)
  );
  const commandTriggerBuild = vscode.commands.registerCommand("drone-ci.triggerBuild", () =>
    buildsProvider.triggerBuild()
  );
  const commandDisableRepo = vscode.commands.registerCommand("drone-ci.disableRepo", (repo) =>
    reposProvider.disableRepo(repo)
  );
  const commandEnableRepo = vscode.commands.registerCommand("drone-ci.enableRepo", (repo) =>
    reposProvider.enableRepo(repo)
  );
  const commandRepairRepo = vscode.commands.registerCommand("drone-ci.repairRepo", (repo) =>
    reposProvider.repairRepo(repo)
  );
  const commandPromoteBuild = vscode.commands.registerCommand("drone-ci.promoteBuild", (build) =>
    buildsProvider.promoteBuild(build)
  );
  const commandApproveBuildStage = vscode.commands.registerCommand(
    "drone-ci.approveBuildStage",
    (stage) => buildsProvider.approveBuildStage(stage)
  );
  const commandDeclineBuildStage = vscode.commands.registerCommand(
    "drone-ci.declineBuildStage",
    (stage) => buildsProvider.declineBuildStage(stage)
  );
  const commandCancelBuild = vscode.commands.registerCommand("drone-ci.cancelBuild", (build) =>
    buildsProvider.cancelBuild(build)
  );
  const commandRestartBuild = vscode.commands.registerCommand("drone-ci.restartBuild", (build) =>
    buildsProvider.restartBuild(build)
  );
  const commandRefreshBuilds = vscode.commands.registerCommand("drone-ci.refreshBuilds", () =>
    buildsProvider.refresh()
  );
  const commandLoadMoreBuilds = vscode.commands.registerCommand("drone-ci.loadMoreBuilds", () =>
    buildsProvider.loadMore()
  );
  const commandRefreshRepos = vscode.commands.registerCommand("drone-ci.refreshRepos", () =>
    reposProvider.refresh()
  );
  const commandRefreshSecrets = vscode.commands.registerCommand("drone-ci.refreshSecrets", () =>
    secretsProvider.refresh()
  );
  const commandRefreshCrons = vscode.commands.registerCommand("drone-ci.refreshCrons", () =>
    cronsProvider.refresh()
  );
  const commandGotoSecretsPage = vscode.commands.registerCommand("drone-ci.gotoSecretsPage", () =>
    secretsProvider.gotoSecretsPage()
  );
  const commandGotoCronPage = vscode.commands.registerCommand("drone-ci.gotoCronPage", () =>
    cronsProvider.gotoCronPage()
  );
  const commandViewBuildStepLog = vscode.commands.registerCommand(
    "drone-ci.viewBuildStepLog",
    async (step) => buildsProvider.viewStepLog(step)
  );
  const commandViewBuildInfo = vscode.commands.registerCommand(
    "drone-ci.viewBuildInfo",
    async (build) => buildsProvider.viewBuildInfo(build)
  );
  const commandGotoServer = vscode.commands.registerCommand("drone-ci.gotoServer", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.url));
  });
  const commandGotoRepoPage = vscode.commands.registerCommand("drone-ci.gotoRepoPage", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.url));
  });
  const commandGotoRepoBranchesPage = vscode.commands.registerCommand(
    "drone-ci.gotoRepoBranchesPage",
    (item) => {
      vscode.env.openExternal(vscode.Uri.parse(item.branchesURL));
    }
  );
  const commandGotoRepoDeploymentsPage = vscode.commands.registerCommand(
    "drone-ci.gotoRepoDeploymentsPage",
    (item) => {
      vscode.env.openExternal(vscode.Uri.parse(item.deploymentsURL));
    }
  );
  const commandGotoRepoSettingsPage = vscode.commands.registerCommand(
    "drone-ci.gotoRepoSettingsPage",
    (item) => {
      vscode.env.openExternal(vscode.Uri.parse(item.settingsURL));
    }
  );
  const commandGotoGitRepoPage = vscode.commands.registerCommand(
    "drone-ci.gotoGitRepoPage",
    (item) => {
      vscode.env.openExternal(vscode.Uri.parse(item.gitURL));
    }
  );
  const commandGotoBuildPage = vscode.commands.registerCommand("drone-ci.gotoBuildPage", (item) => {
    vscode.env.openExternal(vscode.Uri.parse(item.url));
  });
  const commandGotoBuildComparePage = vscode.commands.registerCommand(
    "drone-ci.gotoBuildComparePage",
    (item) => {
      vscode.env.openExternal(vscode.Uri.parse(item.url));
    }
  );
  const commandDeleteServer = vscode.commands.registerCommand("drone-ci.deleteServer", (server) => {
    vscode.window
      .showInformationMessage("Are you sure you want to delete this server?", "Yes", "No")
      .then(async (answer) => {
        if (answer === "Yes") {
          await serversProvider.deleteServer(server);
          if (
            serversProvider.serversNum === 0 ||
            (serversTree.selection.length > 0 && server.label === serversTree.selection[0].label)
          ) {
            droneClient = null;
            buildsProvider.reset();
            cronsProvider.reset();
            secretsProvider.reset();
            reposProvider.reset();
            vscode.commands.executeCommand("setContext", "hasServerSelected", false);
            vscode.commands.executeCommand("setContext", "hasRepoSelected", false);
          }
        }
      });
  });

  const commandDeleteSecret = vscode.commands.registerCommand("drone-ci.deleteSecret", (secret) => {
    vscode.window
      .showInformationMessage("Are you sure you want to delete this secret?", "Yes", "No")
      .then((answer) => {
        if (answer === "Yes") {
          secretsProvider.deleteSecret(secret);
        }
      });
  });

  const commandDeleteCron = vscode.commands.registerCommand("drone-ci.deleteCron", (cron) => {
    vscode.window
      .showInformationMessage("Are you sure you want to delete this cron job?", "Yes", "No")
      .then((answer) => {
        if (answer === "Yes") {
          cronsProvider.deleteCron(cron);
        }
      });
  });

  const commandTriggerCron = vscode.commands.registerCommand(
    "drone-ci.triggerCron",
    async (cron) => {
      await cronsProvider.triggerCron(cron);
      buildsProvider.refresh();
    }
  );
  // vscode.commands.registerCommand("drone-ci.updateRepo", (repo) => reposProvider.updateRepo(repo));

  const commandShowActiveRepos = vscode.commands.registerCommand(
    "drone-ci.showActiveRepos",
    async () => {
      await setConfiguration("drone-ci.filterRepos.byActivity", "Active");
      reposProvider.refresh();
    }
  );
  const commandShowInactiveRepos = vscode.commands.registerCommand(
    "drone-ci.showInactiveRepos",
    async () => {
      await setConfiguration("drone-ci.filterRepos.byActivity", "Inactive");
      reposProvider.refresh();
    }
  );
  const commandShowActiveAndInactiveRepos = vscode.commands.registerCommand(
    "drone-ci.showActiveAndInactiveRepos",
    async () => {
      await setConfiguration("drone-ci.filterRepos.byActivity", "All");
      reposProvider.refresh();
    }
  );
  const commandShowPublicRepos = vscode.commands.registerCommand(
    "drone-ci.showPublicRepos",
    async () => {
      await setConfiguration("drone-ci.filterRepos.byVisibility", "Public");
      reposProvider.refresh();
    }
  );
  const commandShowPrivateRepos = vscode.commands.registerCommand(
    "drone-ci.showPrivateRepos",
    async () => {
      await setConfiguration("drone-ci.filterRepos.byVisibility", "Private");
      reposProvider.refresh();
    }
  );
  const commandShowInternalRepos = vscode.commands.registerCommand(
    "drone-ci.showInternalRepos",
    async () => {
      await setConfiguration("drone-ci.filterRepos.byVisibility", "Internal");
      reposProvider.refresh();
    }
  );
  const commandShowReposWithAnyVisibility = vscode.commands.registerCommand(
    "drone-ci.showReposWithAnyVisibility",
    async () => {
      await setConfiguration("drone-ci.filterRepos.byVisibility", "All");
      reposProvider.refresh();
    }
  );

  const commandSortReposByName = vscode.commands.registerCommand(
    "drone-ci.sortReposByName",
    async () => {
      await setConfiguration("drone-ci.sortRepos.by", "Name");
      reposProvider.refresh();
    }
  );
  const commandSortReposByActivity = vscode.commands.registerCommand(
    "drone-ci.sortReposByActivity",
    async () => {
      await setConfiguration("drone-ci.sortRepos.by", "Activity");
      reposProvider.refresh();
    }
  );
  const commandSortReposByCreationDate = vscode.commands.registerCommand(
    "drone-ci.sortReposByCreationDate",
    async () => {
      await setConfiguration("drone-ci.sortRepos.by", "Creation Date");
      reposProvider.refresh();
    }
  );
  const commandSortReposByLastUpdate = vscode.commands.registerCommand(
    "drone-ci.sortReposByLastUpdate",
    async () => {
      await setConfiguration("drone-ci.sortRepos.by", "Last Update");
      reposProvider.refresh();
    }
  );
  const commandSortReposByVisibility = vscode.commands.registerCommand(
    "drone-ci.sortReposByVisibility",
    async () => {
      await setConfiguration("drone-ci.sortRepos.by", "Visibility");
      reposProvider.refresh();
    }
  );

  const configUpdate = vscode.workspace.onDidChangeConfiguration((event) => {
    const affectedSettings = [
      "drone-ci.sortRepos.by",
      "drone-ci.sortRepos.order",
      "drone-ci.filterRepos.byActivity",
      "drone-ci.filterRepos.byVisibility",
    ].map((setting) => event.affectsConfiguration(setting));
    if (affectedSettings.some((affected) => affected)) {
      reposProvider.refresh();
    }
  });

  context.subscriptions.push(
    ...[
      serversTree,
      reposTree,
      configUpdate,
      commandAddSecret,
      commandEditSecret,
      commandAddServer,
      commandEditServer,
      commandAddCron,
      commandEditCron,
      commandTriggerBuild,
      commandApproveBuildStage,
      commandDeclineBuildStage,
      commandDisableRepo,
      commandEnableRepo,
      commandRepairRepo,
      commandPromoteBuild,
      commandCancelBuild,
      commandRestartBuild,
      commandRefreshBuilds,
      commandLoadMoreBuilds,
      commandRefreshRepos,
      commandRefreshSecrets,
      commandRefreshCrons,
      commandGotoSecretsPage,
      commandGotoCronPage,
      commandViewBuildStepLog,
      commandViewBuildInfo,
      commandGotoServer,
      commandGotoServer,
      commandGotoRepoPage,
      commandGotoRepoBranchesPage,
      commandGotoRepoDeploymentsPage,
      commandGotoRepoSettingsPage,
      commandGotoGitRepoPage,
      commandGotoBuildPage,
      commandGotoBuildComparePage,
      commandDeleteServer,
      commandDeleteSecret,
      commandDeleteCron,
      commandTriggerCron,
      commandShowActiveRepos,
      commandShowInactiveRepos,
      commandShowActiveAndInactiveRepos,
      commandShowPublicRepos,
      commandShowPrivateRepos,
      commandShowInternalRepos,
      commandShowReposWithAnyVisibility,
      commandSortReposByName,
      commandSortReposByActivity,
      commandSortReposByCreationDate,
      commandSortReposByLastUpdate,
      commandSortReposByVisibility,
    ]
  );
}

async function setConfiguration(field: string, value: string) {
  await vscode.workspace.getConfiguration().update(field, value, vscode.ConfigurationTarget.Global);
}
