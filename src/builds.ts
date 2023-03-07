import * as vscode from "vscode";
import { dateTimeFmt } from "./helpers";

interface RepoInfo {
  baseURL?: string;
  owner: string;
  repo: string;
}

interface BuildInfo {
  after: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  author_login: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  author_name: string;
  event: string;
  finished: number;
  message: string;
  link: string;
  number: number;
  status: string;
  sender: string;
  stages: StageInfo[];
  started: number;
  target: string;
  trigger: string;
}

interface StageInfo {
  name: string;
  number: number;
  status: string;
  steps: StepInfo[];
}

interface StepInfo {
  name: string;
  number: number;
  status: string;
}

interface Log {
  out: string;
}

interface BuildIcon {
  icon: string;
  color: string;
}

function getIcon(status: string = "fallback", event?: string): vscode.ThemeIcon {
  let presets: { [status: string]: BuildIcon } = {
    skipped: { icon: "debug-step-over", color: "disabledForeground" },
    declined: { icon: "circle-slash", color: "charts.red" },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    waiting_on_dependencies: { icon: "watch", color: "charts.yellow" },
    blocked: { icon: "warning", color: "charts.yellow" },
    success: { icon: "pass", color: "charts.green" },
    error: { icon: "error", color: "charts.red" },
    failure: { icon: "error", color: "charts.red" },
    pending: { icon: "sync~spin", color: "charts.blue" },
    killed: { icon: "stop-circle", color: "charts.red" },
    running: { icon: "run", color: "charts.green" },
    fallback: { icon: "pass", color: "charts.purple" },
  };
  let selectedPreset: BuildIcon = presets[status] || presets.fallback;
  if (event === "custom" && status !== "running") {
    selectedPreset.icon = "repl";
  } else if (event === "promote" && status !== "running") {
    selectedPreset.icon = "rocket";
  } else if (event === "cron" && status !== "running") {
    selectedPreset.icon = "calendar";
  }

  return new vscode.ThemeIcon(selectedPreset.icon, new vscode.ThemeColor(selectedPreset.color));
}

export class BuildsProvider implements vscode.TreeDataProvider<Build | Step | None> {
  private client: any | null = null;
  public data: RepoInfo | null = null;
  public builds: BuildInfo[] = [];
  public page: number = 1;
  private recentPageSuccess: boolean = true;
  private fastRefresh: boolean = false;

  constructor() {}

  private _onDidChangeTreeData: vscode.EventEmitter<Build | undefined | null | void> = new vscode.EventEmitter<
    Build | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<Build | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(client?: any, data?: RepoInfo | null) {
    if (client !== undefined) {
      this.client = client;
    }
    if (data !== undefined) {
      this.data = data;
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem) {
    return element;
  }

  async getChildren(element?: Build | Stage): Promise<Build[] | Step[] | LoadMore[] | None[]> {
    if (this.client && this.data) {
      if (element) {
        if (element.contextValue?.startsWith("build")) {
          try {
            let buildInfo: BuildInfo | null = await this.client.getBuild(
              this.data.owner,
              this.data.repo,
              element.number
            );
            if (buildInfo && buildInfo.stages && buildInfo.stages.length > 0) {
              return buildInfo.stages.map((stage) => new Stage(stage, buildInfo!.number));
            } else {
              return [new None("No stages found")];
            }
          } catch (e) {
            return [new None("Error occurred while loading build stages")];
          }
        } else if (element.contextValue?.startsWith("stage")) {
          const stage = element as Stage;
          if (stage.steps && stage.steps.length > 0) {
            return stage.steps.map((step) => new Step(step, stage.number, stage.build));
          }
          return [new None("No steps found")];
        }
        return [new None("Nothing found")];
      } else {
        if (!this.fastRefresh) {
          await this.getBuilds(1, true);
        }
        this.fastRefresh = false;
        let owner: string = this.data.owner;
        let repo: string = this.data.repo;

        let buildItems: (Build | LoadMore)[] = this.builds.map(
          (buildInfo: BuildInfo) =>
            new Build(buildInfo, {
              baseURL: this.client._axios.defaults.baseURL,
              owner,
              repo,
            })
        );
        if (buildItems.length > 0) {
          vscode.commands.executeCommand("setContext", "hasBuilds", true);
          if (this.recentPageSuccess) {
            buildItems.push(new LoadMore());
          }
          return buildItems;
        } else {
          return [new None("No builds found")];
        }
      }
    } else {
      return [new None("Select server and repository to view builds")];
    }
  }

  async getBuilds(page: number, clean?: boolean) {
    if (this.data) {
      if (clean) {
        this.builds = [];
      }
      try {
        let builds: BuildInfo[] = await this.client.getBuilds(this.data.owner, this.data.repo, page);
        if (builds.length > 0) {
          this.page = page;
          this.recentPageSuccess = builds.length < 25 ? false : true;
          this.builds.push(...builds);
        } else {
          this.recentPageSuccess = false;
        }
      } catch (e) {
        this.recentPageSuccess = false;
      }
    }
  }

  async loadMore() {
    await this.getBuilds(this.page + 1);
    this.fastRefresh = true;
    this.refresh();
  }

  async getStepLog(step: Step): Promise<string | undefined> {
    if (this.data) {
      try {
        let logs = await this.client.getLogs(this.data.owner, this.data.repo, step.build, step.stage, step.step);
        return logs.map((log: Log) => log.out).join("");
      } catch (error) {
        return undefined;
      }
    }
    return undefined;
  }

  async getBuildInfo(build: Build): Promise<string | undefined> {
    if (this.data) {
      try {
        let info = await this.client.getBuild(this.data.owner, this.data.repo, build.number);
        return JSON.stringify(info, null, 2);
      } catch (error) {
        return undefined;
      }
    }
    return undefined;
  }

  async viewStepLog(step: Step) {
    const logs = await this.getStepLog(step);
    if (logs) {
      vscode.workspace.openTextDocument({ content: logs }).then((a) => {
        vscode.window.showTextDocument(a, 1, false);
      });
    } else {
      vscode.window.showWarningMessage("Build step log could not be loaded");
    }
  }
  async viewBuildInfo(build: Build) {
    const info = await this.getBuildInfo(build);
    if (info) {
      vscode.workspace.openTextDocument({ content: info }).then((a) => {
        vscode.window.showTextDocument(a, 1, false);
      });
    } else {
      vscode.window.showInformationMessage("Build info could not be loaded");
    }
  }
  async cancelBuild(build: Build) {
    if (this.data) {
      try {
        await this.client.cancelBuild(this.data.owner, this.data.repo, build.number);
        this.refresh();
      } catch (error: any) {
        vscode.window.showWarningMessage(`Build ${build.number} was not cancelled. ${error.message}`);
      }
    }
  }

  async approveBuildStage(stage: Stage) {
    if (this.data) {
      try {
        await this.client.approveBuild(this.data.owner, this.data.repo, stage.build, stage.number);
        this.refresh();
      } catch (error: any) {
        vscode.window.showWarningMessage(
          `Stage ${stage.number} of build ${stage.build} was not approved. ${error.message}`
        );
      }
    }
  }

  async declineBuildStage(stage: Stage) {
    if (this.data) {
      try {
        await this.client.declineBuild(this.data.owner, this.data.repo, stage.build, stage.number);
        this.refresh();
      } catch (error: any) {
        vscode.window.showWarningMessage(
          `Stage ${stage.number} of build ${stage.build} was not declined. ${error.message}`
        );
      }
    }
  }

  async restartBuild(build: Build) {
    if (this.data) {
      try {
        await this.client.retryBuild(this.data.owner, this.data.repo, build.number);
        this.refresh();
      } catch (error: any) {
        vscode.window.showWarningMessage(`Build ${build.number} was not restarted. ${error.message}`);
      }
    }
  }

  async triggerBuild() {
    if (this.data) {
      let branch: string | undefined = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: "Branch name",
        title: "Specify branch to trigger build on",
        prompt: "Example: dev or master",
      });
      if (branch) {
        let commit: string | undefined = await vscode.window.showInputBox({
          ignoreFocusOut: true,
          title: "Specify commit (optional)",
          prompt: "Leave blank to trigger build based on the latest commit",
        });
        try {
          await this.client.triggerBuild(this.data.owner, this.data.repo, {
            branch,
            commit: commit || this.builds[0].after,
          });
          this.refresh();
        } catch (e) {
          vscode.window.showWarningMessage(
            'Build was not triggered. Maybe you need to add "custom" event to trigger section of your pipeline. Refer to https://docs.drone.io/api/builds/build_create/ for more information.'
          );
        }
      }
    } else {
      vscode.window.showInformationMessage(`Please select Drone CI server and repository to trigger build`);
    }
  }

  async promoteBuild(build: Build) {
    if (this.data) {
      let target: string | undefined = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: "Target name",
        title: "Specify target to promote build to",
        prompt: "Example: development or production",
      });
      if (!target) {
        return;
      }
      let params: object = {};
      let paramsJSON: string | undefined = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        title: "Enter params as valid JSON (optional)",
      });

      if (paramsJSON) {
        try {
          params = JSON.parse(paramsJSON);
        } catch (e) {
          vscode.window.showInformationMessage("Parameters could not be parsed");
        }
      }

      try {
        await this.client.promoteBuild(this.data.owner, this.data.repo, build.number, target, params);
        this.refresh();
      } catch (e) {
        vscode.window.showWarningMessage("Build was not promoted");
      }
    } else {
      vscode.window.showInformationMessage(`Please select Drone CI server and repository to trigger build`);
    }
  }
}

class None extends vscode.TreeItem {
  constructor(label: string) {
    super(label || "No builds found", vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

class LoadMore extends vscode.TreeItem {
  constructor() {
    super("Load more...", vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("sync");
    this.contextValue = "loadmore";
    this.command = { title: "Load More", command: "drone-ci.loadMoreBuilds" };
  }
}

class Stage extends vscode.TreeItem {
  public number: number;
  public build: number;
  public steps?: StepInfo[];

  constructor(stage: StageInfo, build: number) {
    const label = `Stage ${stage.number}: ${stage.name}`;
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = stage.status === "blocked" ? "stage_blocked" : "stage";
    this.number = stage.number;
    this.steps = stage.steps;
    this.build = build;
    this.iconPath = getIcon(stage.status);
  }
}

class Step extends vscode.TreeItem {
  public step: number;
  public stage: number;
  public build: number;

  constructor(step: StepInfo, stage: number, build: number) {
    const label = `Step ${step.number}: ${step.name}`;
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "step";
    this.step = step.number;
    this.stage = stage;
    this.build = build;
    this.iconPath = getIcon(step.status);
  }
}

class Build extends vscode.TreeItem {
  number: number;
  compareURL: string;
  url: string;

  constructor(build: BuildInfo, repo: RepoInfo) {
    let label = `#${build.number}: ${build.message.trim()}`;
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.number = build.number;
    this.compareURL = build.link;
    this.url = `${repo.baseURL}/${repo.owner}/${repo.repo}/${build.number}`;
    this.description = `(by ${build.sender} on "${build.target}")`;
    this.tooltip = [
      `${label} ${this.description}`,
      // EVENT COMMIT to TARGET
      `${build.event.toUpperCase()} ${build.after.slice(0, 8)} to "${build.target}"\n`,
      `Status: ${build.status}`,
      build.started ? `Started on ${dateTimeFmt.format(build.started * 1000)}` : null,
      build.finished ? `Finished on ${dateTimeFmt.format(build.finished * 1000)}` : null,
      `Author: ${build.author_login} (${build.author_name})`,
    ]
      .filter((i) => !!i)
      .join("\n");
    this.contextValue = `build_${build.status}`;
    this.iconPath = getIcon(build.status, build.event);
  }
}
