"use strict";

import * as vscode from "vscode";
import * as _ from "./lodash"

// name of setting states and default values specified in package.json
const SettingState1: string = "toggle.settingState1";
const SettingState2: string = "toggle.settingState2";
const PrimarySettingText: string = "toggle.primarySettingText";
const SettingState1Text: string = "toggle.settingState1Text";
const SettingState2Text: string = "toggle.settingState2Text";
const IconEnabled: string = "toggle.iconEnabled";
const State1Default: string = "state1";
const State2Default: string = "state2";
const StateOn: string = "$(eye)";
const StateOff: string = "$(eye-closed)";

type ToggleSetting = {
  title: string;
  command: string;
  statusBar: {
    item?: vscode.StatusBarItem;
    config: string;
    position: number;
    text: string;
    tooltip: string;
  };
};

const Setting: { [key: string]: ToggleSetting } = {
  primary: {
    title: "toggle.settingTitle",
    command: "extension.toggle",
    statusBar: {
      config: "toggle.showStatusbarPrimary",
      position: 3,
      text: vscode.workspace.getConfiguration().get(PrimarySettingText),
      tooltip: "Setting Toggle - Primary Setting",
    },
  },
  s1: {
    title: "toggle.setting1Title",
    command: "extension.toggle_s1",
    statusBar: {
      config: "toggle.showStatusbarS1",
      position: 2,
      text: vscode.workspace.getConfiguration().get(SettingState1Text),
      tooltip: "Setting Toggle - State 1 Setting",
    },
  },
  s2: {
    title: "toggle.setting2Title",
    command: "extension.toggle_s2",
    statusBar: {
      config: "toggle.showStatusbarS2",
      position: 1,
      text: vscode.workspace.getConfiguration().get(SettingState2Text),
      tooltip: "Setting Toggle - State 2 Setting",
    },
  },
};

export function activate(context: vscode.ExtensionContext) {
  console.log(`Extension "toggle-btn" is now active!`);

  for (const [, setting] of Object.entries(Setting)) {
    setting.statusBar.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      setting.statusBar.position
    );
    setting.statusBar.item.text = setting.statusBar.text;
    setting.statusBar.item.tooltip = setting.statusBar.tooltip;
    setting.statusBar.item.command = setting.command;
    context.subscriptions.push(
      setting.statusBar.item,
      vscode.commands.registerCommand(setting.command, () => {
        toggleSetting(setting.title);
      })
    );
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(showInStatusBar)
  );

  showInStatusBar();
}

function showInStatusBar() {
  const config = vscode.workspace.getConfiguration();

  for (const [, setting] of Object.entries(Setting)) {
    const settingTitle: string = config.get(setting.title);
    // shows in the status bar if config is enabled and setting has been found
    if (config.get(setting.statusBar.config) && settingTitle && config.get(IconEnabled)) {
      // icon at the status bar for boolean status
      const state = config.get(settingTitle);
      if (state !== undefined && typeof state === "boolean") {
        setting.statusBar.item.text = setting.statusBar.text + ": " + ( state ? StateOn : StateOff );
      }
      setting.statusBar.item.show();
    } else {
      setting.statusBar.item.hide();
    }
  }
}

export function deactivate() {}

// Regex to match nested setting with parent setting in group 1
// and child setting in group 2
const reMatchNestedSetting = /^\[(.+)\](.*)$/;

function toggleSetting(toggleTitle: string) {
  try {
    let config = vscode.workspace.getConfiguration();
    let settingTitle: string = config.get(toggleTitle);
    let m = settingTitle.match(reMatchNestedSetting);
    if (m && m.length === 3) {
      const language = m[1];
      config = vscode.workspace.getConfiguration("", { languageId: language });
      settingTitle = m[2];
    }

    let settingSubpath = undefined;
    if (settingTitle.includes('[')) {
      settingSubpath = settingTitle.substring(settingTitle.indexOf('['))
      settingTitle = settingTitle.substring(0, settingTitle.indexOf('['))
    }

    const state = config.get(settingTitle);
    if (state == undefined) {
      vscode.window.showErrorMessage(
        `Setting Toggle: "${settingTitle}" is not a valid setting.`
      );
      return;
    }

    // if (typeof state === "boolean" || typeof state === "number" || typeof state === "string") {
      toggle(config, settingTitle, settingSubpath, state);
    // } else {
    //   vscode.window.showErrorMessage(
    //     `Setting Toggle: "${settingTitle}" has invalid type: must be boolean, number or string to toggle.`
    //   );
    // }
  } catch (err) {
    vscode.window.showErrorMessage("Setting Toggle: Error: " + err);
  }
}


async function toggle(
  config: vscode.WorkspaceConfiguration,
  settingTitle: string,
  settingSubpath: string | undefined,
  oldState: unknown
) {
  console.info(`oldState type: ${typeof oldState}`)
  console.info(`oldState: ${JSON.stringify(oldState)}`)

  const subsettingState1: number | string | boolean = config.get(SettingState1);
  const subsettingState2: number | string | boolean = config.get(SettingState2);

  let oldSubstate = getSubstate(oldState, settingSubpath)
  let newSubstate: number | string | boolean;

  console.info(`oldSubstate: ${oldSubstate}`)
  // toggle using custom setting values
  if (oldSubstate === subsettingState1) {
    newSubstate = subsettingState2;
  } else if (oldSubstate === subsettingState2) {
    newSubstate = subsettingState1;
  } else {
    vscode.window.showErrorMessage(
      `Setting Toggle: State does not match state1 or state2. ${settingTitle} cannot be toggled.`
      );
      return;
    }
    
  console.info(`newSubstate: ${newSubstate}`)

  const newState = setSubpath(oldState, settingSubpath, newSubstate)
  console.info(`newState: ${newState}`)

  const isGlobalSetting = true;
  await config.update(settingTitle, newState, isGlobalSetting);
  vscode.window.showInformationMessage(
    `Setting Toggle '${settingTitle}${settingSubpath}' changed to '${newSubstate}'.`
  );
}

function getSubstate(state: unknown, subpath: string | undefined): unknown {
  if(subpath === undefined) 
    return state
  return _.get(state, subpath, undefined)
}
function setSubpath(state: unknown, subpath: string | undefined, value: unknown): unknown {
  if(subpath === undefined)
    return state
  _.set(state, subpath, value)
  return state
}
