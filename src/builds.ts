import * as vscode from "vscode";

interface RepoInfo {
  baseURL?: string;
  owner: string;
  repo: string;
}

interface BuildInfo {
  number: number;
  status: string;
  target: string;
  message: string;
  trigger: string;
  link: string;
  stages: StageInfo[];
}

interface StageInfo {
  number: number;
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

export class BuildsProvider implements vscode.TreeDataProvider<Build | Step | None> {
  private client: any | null = null;
  public data: RepoInfo | null = null;

  constructor() {}

  private _onDidChangeTreeData: vscode.EventEmitter<Build | undefined | null | void> = new vscode.EventEmitter<
    Build | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<Build | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(client?: any, data?: RepoInfo) {
    if (client) {
      this.client = client;
    }
    if (data) {
      this.data = data;
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem) {
    return element;
  }

  async getChildren(element?: Build): Promise<Build[] | Step[] | None[]> {
    if (this.client && this.data) {
      if (element) {
        let buildInfo: BuildInfo | null = await this.client.getBuild(this.data.owner, this.data.repo, element.build);

        if (buildInfo && buildInfo.stages && buildInfo.stages[0].steps) {
          const stepsInfo: { step: StepInfo; stage: StageInfo; build: number }[] = buildInfo.stages
            .map((stage) =>
              stage.steps.map((step) => ({
                build: element.build,
                stage,
                step,
              }))
            )
            .flat();
          let steps: Step[] = stepsInfo.map((stepInfo) => new Step(stepInfo.step, stepInfo.stage, stepInfo.build));
          if (steps.length > 0) {
            return steps;
          }
        }
        return [new None("Nothing found")];
      } else {
        let builds: BuildInfo[] = (await this.client.getBuilds(this.data.owner, this.data.repo, 1, 1000)) || [];
        let owner: string = this.data.owner;
        let repo: string = this.data.repo;

        const results = builds.map(
          (buildInfo: BuildInfo) =>
            new Build(buildInfo, {
              baseURL: this.client._axios.defaults.baseURL,
              owner,
              repo,
            })
        );
        if (results.length > 0) {
          return results;
        } else {
          return [new None("Nothing found")];
        }
      }
    } else {
      return [new None("Select server and repository to view builds")];
    }
  }

  async getStepLog(step: Step): Promise<string | undefined> {
    if (this.data) {
      let logs = await this.client.getLogs(this.data.owner, this.data.repo, step.build, step.stage, step.step);
      return logs.map((log: Log) => log.out).join("");
    }
    return undefined;
  }

  async getBuildInfo(element: Build): Promise<string | undefined> {
    if (this.data) {
      let info = await this.client.getBuild(this.data.owner, this.data.repo, element.build);
      return JSON.stringify(info, null, 2);
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
      vscode.window.showInformationMessage("Build step log could not be loaded");
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
}

class None extends vscode.TreeItem {
  constructor(label: string) {
    super(label || "No builds found", vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

class Step extends vscode.TreeItem {
  public step: number;
  public stage: number;

  constructor(step: StepInfo, stage: StageInfo, public build: number) {
    const label = `Stage ${stage.number}: ${step.name}`;
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "step";
    this.step = step.number;
    this.stage = stage.number;
    this.iconPath =
      step.status === "success"
        ? new vscode.ThemeIcon("pass", new vscode.ThemeColor("charts.green"))
        : new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red"));
  }
}

class Build extends vscode.TreeItem {
  build: number;
  compareURL: string;
  url: string;

  constructor(build: BuildInfo, repo: RepoInfo) {
    let label = `Build ${build.number}: ${build.message.trim()}`;
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.build = build.number;
    this.compareURL = build.link;
    this.url = `${repo.baseURL}/${repo.owner}/${repo.repo}/${build.number}`;
    this.description = `(by ${build.trigger} on ${build.target})`;
    this.tooltip = `${label} ${this.description}`;
    this.contextValue = "build";
    this.iconPath =
      build.status === "success"
        ? new vscode.ThemeIcon("pass", new vscode.ThemeColor("charts.green"))
        : new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red"));
  }
}
