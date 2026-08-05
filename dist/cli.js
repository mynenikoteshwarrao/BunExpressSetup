#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports2) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @constructor
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       * @constructor
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports2.CommanderError = CommanderError2;
    exports2.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports2) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.length > 3 && this._name.slice(-3) === "...") {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @api private
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(`Allowed choices are ${this.argChoices.join(", ")}.`);
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports2.Argument = Argument2;
    exports2.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports2) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        if (cmd._hasImplicitHelpCommand()) {
          const [, helpName, helpArgs] = cmd._helpCommandnameAndArgs.match(/([^ ]+) *(.*)/);
          const helpCommand = cmd.createCommand(helpName).helpOption(false);
          helpCommand.description(cmd._helpCommandDescription);
          if (helpArgs) helpCommand.arguments(helpArgs);
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns number
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const showShortHelpFlag = cmd._hasHelpOption && cmd._helpShortFlag && !cmd._findOption(cmd._helpShortFlag);
        const showLongHelpFlag = cmd._hasHelpOption && !cmd._findOption(cmd._helpLongFlag);
        if (showShortHelpFlag || showLongHelpFlag) {
          let helpOption;
          if (!showShortHelpFlag) {
            helpOption = cmd.createOption(cmd._helpLongFlag, cmd._helpDescription);
          } else if (!showLongHelpFlag) {
            helpOption = cmd.createOption(cmd._helpShortFlag, cmd._helpDescription);
          } else {
            helpOption = cmd.createOption(cmd._helpFlags, cmd._helpDescription);
          }
          visibleOptions.push(helpOption);
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(max, helper.subcommandTerm(command).length);
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(max, helper.argumentTerm(argument).length);
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          return `${option.description} (${extraInfo.join(", ")})`;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
        }
        if (extraInfo.length > 0) {
          const extraDescripton = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescripton}`;
          }
          return extraDescripton;
        }
        return argument.description;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth || 80;
        const itemIndentWidth = 2;
        const itemSeparatorWidth = 2;
        function formatItem(term, description) {
          if (description) {
            const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
            return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
          }
          return term;
        }
        function formatList(textArray) {
          return textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
        }
        let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([helper.wrap(commandDescription, helpWidth, 0), ""]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument));
        });
        if (argumentList.length > 0) {
          output = output.concat(["Arguments:", formatList(argumentList), ""]);
        }
        const optionList = helper.visibleOptions(cmd).map((option) => {
          return formatItem(helper.optionTerm(option), helper.optionDescription(option));
        });
        if (optionList.length > 0) {
          output = output.concat(["Options:", formatList(optionList), ""]);
        }
        if (this.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return formatItem(helper.optionTerm(option), helper.optionDescription(option));
          });
          if (globalOptionList.length > 0) {
            output = output.concat(["Global Options:", formatList(globalOptionList), ""]);
          }
        }
        const commandList = helper.visibleCommands(cmd).map((cmd2) => {
          return formatItem(helper.subcommandTerm(cmd2), helper.subcommandDescription(cmd2));
        });
        if (commandList.length > 0) {
          output = output.concat(["Commands:", formatList(commandList), ""]);
        }
        return output.join("\n");
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Wrap the given string to width characters per line, with lines after the first indented.
       * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
       *
       * @param {string} str
       * @param {number} width
       * @param {number} indent
       * @param {number} [minColumnWidth=40]
       * @return {string}
       *
       */
      wrap(str, width, indent, minColumnWidth = 40) {
        const indents = " \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF";
        const manualIndent = new RegExp(`[\\n][${indents}]+`);
        if (str.match(manualIndent)) return str;
        const columnWidth = width - indent;
        if (columnWidth < minColumnWidth) return str;
        const leadingStr = str.slice(0, indent);
        const columnText = str.slice(indent).replace("\r\n", "\n");
        const indentString = " ".repeat(indent);
        const zeroWidthSpace = "\u200B";
        const breaks = `\\s${zeroWidthSpace}`;
        const regex = new RegExp(`
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`, "g");
        const lines = columnText.match(regex) || [];
        return leadingStr + lines.map((line, i) => {
          if (line === "\n") return "";
          return (i > 0 ? indentString : "") + line.trimEnd();
        }).join("\n");
      }
    };
    exports2.Help = Help2;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports2) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {string | string[]} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {Object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @api private
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(`Allowed choices are ${this.argChoices.join(", ")}.`);
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as a object attribute key.
       *
       * @return {string}
       * @api private
       */
      attributeName() {
        return camelcase(this.name().replace(/^no-/, ""));
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @api private
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @api private
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str) {
      return str.split("-").reduce((str2, word) => {
        return str2 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const flagParts = flags.split(/[ |,]+/);
      if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1])) shortFlag = flagParts.shift();
      longFlag = flagParts.shift();
      if (!shortFlag && /^-[^-]$/.test(longFlag)) {
        shortFlag = longFlag;
        longFlag = void 0;
      }
      return { shortFlag, longFlag };
    }
    exports2.Option = Option2;
    exports2.splitOptionFlags = splitOptionFlags;
    exports2.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports2) {
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance) return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        d[0][j] = j;
      }
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports2.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports2) {
    var EventEmitter = require("events").EventEmitter;
    var childProcess = require("child_process");
    var path10 = require("path");
    var fs10 = require("fs");
    var process2 = require("process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2, splitOptionFlags, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = true;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._outputConfiguration = {
          writeOut: (str) => process2.stdout.write(str),
          writeErr: (str) => process2.stderr.write(str),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          outputError: (str, write) => write(str)
        };
        this._hidden = false;
        this._hasHelpOption = true;
        this._helpFlags = "-h, --help";
        this._helpDescription = "display help for command";
        this._helpShortFlag = "-h";
        this._helpLongFlag = "--help";
        this._addImplicitHelpCommand = void 0;
        this._helpCommandName = "help";
        this._helpCommandnameAndArgs = "help [command]";
        this._helpCommandDescription = "display help for command";
        this._helpConfiguration = {};
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._hasHelpOption = sourceCommand._hasHelpOption;
        this._helpFlags = sourceCommand._helpFlags;
        this._helpDescription = sourceCommand._helpDescription;
        this._helpShortFlag = sourceCommand._helpShortFlag;
        this._helpLongFlag = sourceCommand._helpLongFlag;
        this._helpCommandName = sourceCommand._helpCommandName;
        this._helpCommandnameAndArgs = sourceCommand._helpCommandnameAndArgs;
        this._helpCommandDescription = sourceCommand._helpCommandDescription;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @api private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {Object|string} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {Object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this.commands.push(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {Object} [configuration] - configuration options
       * @return {Command|Object} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // functions to change where being written, stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // matching functions to specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // functions based on what is being written out
       *     outputError(str, write) // used for displaying errors, and not used for displaying help
       *
       * @param {Object} [configuration] - configuration options
       * @return {Command|Object} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        Object.assign(this._outputConfiguration, configuration);
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {boolean|string} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {Object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this.commands.push(cmd);
        cmd.parent = this;
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {Function|*} [fn] - custom argument processing function
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, fn, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof fn === "function") {
          argument.default(defaultValue).argParser(fn);
        } else {
          argument.default(fn);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument && previousArgument.variadic) {
          throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Override default decision whether to add implicit help command.
       *
       *    addHelpCommand() // force on
       *    addHelpCommand(false); // force off
       *    addHelpCommand('help [cmd]', 'display help for [cmd]'); // force on with custom details
       *
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(enableOrNameAndArgs, description) {
        if (enableOrNameAndArgs === false) {
          this._addImplicitHelpCommand = false;
        } else {
          this._addImplicitHelpCommand = true;
          if (typeof enableOrNameAndArgs === "string") {
            this._helpCommandName = enableOrNameAndArgs.split(" ")[0];
            this._helpCommandnameAndArgs = enableOrNameAndArgs;
          }
          this._helpCommandDescription = description || this._helpCommandDescription;
        }
        return this;
      }
      /**
       * @return {boolean}
       * @api private
       */
      _hasImplicitHelpCommand() {
        if (this._addImplicitHelpCommand === void 0) {
          return this.commands.length && !this._actionHandler && !this._findCommand("help");
        }
        return this._addImplicitHelpCommand;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @api private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {Option | Argument} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @api private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(name, option.defaultValue === void 0 ? true : option.defaultValue, "default");
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        this.options.push(option);
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._concatValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @api private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {Function|*} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
      * Add a required option which must have a value after parsing. This usually means
      * the option must be specified on the command line. (Otherwise the same as .option().)
      *
      * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
      *
      * @param {string} flags
      * @param {string} [description]
      * @param {Function|*} [parseArg] - custom option processing function or default value
      * @param {*} [defaultValue]
      * @return {Command} `this` command for chaining
      */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {Boolean} [combine=true] - if `true` or omitted, an optional value can be specified directly after the flag.
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {Boolean} [allowUnknown=true] - if `true` or omitted, no error will be thrown
       * for unknown options.
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {Boolean} [allowExcess=true] - if `true` or omitted, no error will be thrown
       * for excess arguments.
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {Boolean} [positional=true]
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {Boolean} [passThrough=true]
       * for unknown options.
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        if (!!this.parent && passThrough && !this.parent._enablePositionalOptions) {
          throw new Error("passThroughOptions can not be used without turning on enablePositionalOptions for parent command(s)");
        }
        return this;
      }
      /**
        * Whether to store option values as properties on command object,
        * or store separately (specify false). In both cases the option values can be accessed using .opts().
        *
        * @param {boolean} [storeAsProperties=true]
        * @return {Command} `this` command for chaining
        */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {Object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {Object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
        * Store option value and where the value came from.
        *
        * @param {string} key
        * @param {Object} value
        * @param {string} source - expected values are default/config/env/cli/implied
        * @return {Command} `this` command for chaining
        */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
        * Get source of option value.
        * Expected values are default | config | env | cli | implied
        *
        * @param {string} key
        * @return {string}
        */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
        * Get source of option value. See also .optsWithGlobals().
        * Expected values are default | config | env | cli | implied
        *
        * @param {string} key
        * @return {string}
        */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @api private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0) {
          argv = process2.argv;
          if (process2.versions && process2.versions.electron) {
            parseOptions.from = "electron";
          }
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process2.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          default:
            throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
        }
        if (!this._name && this._scriptPath) this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * The default expectation is that the arguments are from node and have the application as argv[0]
       * and the script being run in argv[1], with user parameters after that.
       *
       * @example
       * program.parse(process.argv);
       * program.parse(); // implicitly use process.argv and auto-detect node vs electron conventions
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {Object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async. Returns a Promise.
       *
       * The default expectation is that the arguments are from node and have the application as argv[0]
       * and the script being run in argv[1], with user parameters after that.
       *
       * @example
       * await program.parseAsync(process.argv);
       * await program.parseAsync(); // implicitly use process.argv and auto-detect node vs electron conventions
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {Object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Execute a sub-command executable.
       *
       * @api private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path10.resolve(baseDir, baseName);
          if (fs10.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path10.extname(baseName))) return void 0;
          const foundExt = sourceExt.find((ext) => fs10.existsSync(`${localBin}${ext}`));
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs10.realpathSync(this._scriptPath);
          } catch (err) {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path10.resolve(path10.dirname(resolvedScriptPath), executableDir);
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path10.basename(this._scriptPath, path10.extname(this._scriptPath));
            if (legacyName !== this._name) {
              localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path10.extname(executableFile));
        let proc;
        if (process2.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process2.execArgv).concat(args);
            proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process2.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        if (!exitCallback) {
          proc.on("close", process2.exit.bind(process2));
        } else {
          proc.on("close", () => {
            exitCallback(new CommanderError2(process2.exitCode || 0, "commander.executeSubCommandAsync", "(close)"));
          });
        }
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
            const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
            throw new Error(executableMissing);
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process2.exit(1);
          } else {
            const wrappedError = new CommanderError2(1, "commander.executeSubCommandAsync", "(error)");
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @api private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @api private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(subcommandName, [], [
          this._helpLongFlag || this._helpShortFlag
        ]);
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @api private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @api private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {Promise|undefined} promise
       * @param {Function} fn
       * @return {Promise|undefined}
       * @api private
       */
      _chainOrCall(promise, fn) {
        if (promise && promise.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {Promise|undefined} promise
       * @param {string} event
       * @return {Promise|undefined}
       * @api private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {Promise|undefined} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {Promise|undefined}
       * @api private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @api private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._hasImplicitHelpCommand() && operands[0] === this._helpCommandName) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          outputHelpIfRequested(this, unknown);
          return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        outputHelpIfRequested(this, parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent && this.parent.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @api private
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @api private
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @api private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @api private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter(
          (option) => {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0) {
              return false;
            }
            return this.getOptionValueSource(optionKey) !== "default";
          }
        );
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @api private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {String[]} argv
       * @return {{operands: String[], unknown: String[]}}
       */
      parseOptions(argv) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        const args = argv.slice();
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        let activeVariadicOption = null;
        while (args.length) {
          const arg = args.shift();
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args);
            break;
          }
          if (activeVariadicOption && !maybeOption(arg)) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args.shift();
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (args.length > 0 && !maybeOption(args[0])) {
                  value = args.shift();
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                args.unshift(`-${arg.slice(2)}`);
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (maybeOption(arg)) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            } else if (arg === this._helpCommandName && this._hasImplicitHelpCommand()) {
              operands.push(arg);
              if (args.length > 0) operands.push(...args);
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg);
            if (args.length > 0) dest.push(...args);
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {Object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {Object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {Object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(`${message}
`, this._outputConfiguration.writeErr);
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @api private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(this.getOptionValueSource(optionKey))) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @api private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter((option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @api private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @api private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @api private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @api private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
          const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @api private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @api private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @api private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {this | string | undefined} `this` command for chaining, or version string if no arguments
       */
      version(str, flags, description) {
        if (str === void 0) return this._version;
        this._version = str;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this.options.push(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str}
`);
          this._exit(0, "commander.version", str);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {Object} [argsDescription]
       * @return {string|Command}
       */
      description(str, argsDescription) {
        if (str === void 0 && argsDescription === void 0) return this._description;
        this._description = str;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {string|Command}
       */
      summary(str) {
        if (str === void 0) return this._summary;
        this._summary = str;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {string|Command}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name) throw new Error("Command alias can't be the same as its name");
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {string[]|Command}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {String|Command}
       */
      usage(str) {
        if (str === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._hasHelpOption ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {string|Command}
       */
      name(str) {
        if (str === void 0) return this._name;
        this._name = str;
        return this;
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path10.basename(filename, path10.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {string|null|Command}
       */
      executableDir(path11) {
        if (path11 === void 0) return this._executableDir;
        this._executableDir = path11;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        if (helper.helpWidth === void 0) {
          helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
        }
        return helper.formatHelp(this, helper);
      }
      /**
       * @api private
       */
      _getHelpContext(contextOptions) {
        contextOptions = contextOptions || {};
        const context = { error: !!contextOptions.error };
        let write;
        if (context.error) {
          write = (arg) => this._outputConfiguration.writeErr(arg);
        } else {
          write = (arg) => this._outputConfiguration.writeOut(arg);
        }
        context.write = contextOptions.write || write;
        context.command = this;
        return context;
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const context = this._getHelpContext(contextOptions);
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
        this.emit("beforeHelp", context);
        let helpInformation = this.helpInformation(context);
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        context.write(helpInformation);
        if (this._helpLongFlag) {
          this.emit(this._helpLongFlag);
        }
        this.emit("afterHelp", context);
        this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", context));
      }
      /**
       * You can pass in flags and a description to override the help
       * flags and help description for your command. Pass in false to
       * disable the built-in help option.
       *
       * @param {string | boolean} [flags]
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          this._hasHelpOption = flags;
          return this;
        }
        this._helpFlags = flags || this._helpFlags;
        this._helpDescription = description || this._helpDescription;
        const helpFlags = splitOptionFlags(this._helpFlags);
        this._helpShortFlag = helpFlags.shortFlag;
        this._helpLongFlag = helpFlags.longFlag;
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = process2.exitCode || 0;
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {string | Function} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
    };
    function outputHelpIfRequested(cmd, args) {
      const helpOption = cmd._hasHelpOption && args.find((arg) => arg === cmd._helpLongFlag || arg === cmd._helpShortFlag);
      if (helpOption) {
        cmd.outputHelp();
        cmd._exit(0, "commander.helpDisplayed", "(outputHelp)");
      }
    }
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    exports2.Command = Command2;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports2, module2) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports2 = module2.exports = new Command2();
    exports2.program = exports2;
    exports2.Command = Command2;
    exports2.Option = Option2;
    exports2.Argument = Argument2;
    exports2.Help = Help2;
    exports2.CommanderError = CommanderError2;
    exports2.InvalidArgumentError = InvalidArgumentError2;
    exports2.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// node_modules/universalify/index.js
var require_universalify = __commonJS({
  "node_modules/universalify/index.js"(exports2) {
    "use strict";
    exports2.fromCallback = function(fn) {
      return Object.defineProperty(function(...args) {
        if (typeof args[args.length - 1] === "function") fn.apply(this, args);
        else {
          return new Promise((resolve, reject) => {
            args.push((err, res) => err != null ? reject(err) : resolve(res));
            fn.apply(this, args);
          });
        }
      }, "name", { value: fn.name });
    };
    exports2.fromPromise = function(fn) {
      return Object.defineProperty(function(...args) {
        const cb = args[args.length - 1];
        if (typeof cb !== "function") return fn.apply(this, args);
        else {
          args.pop();
          fn.apply(this, args).then((r) => cb(null, r), cb);
        }
      }, "name", { value: fn.name });
    };
  }
});

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "node_modules/graceful-fs/polyfills.js"(exports2, module2) {
    var constants = require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs10) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs10);
      }
      if (!fs10.lutimes) {
        patchLutimes(fs10);
      }
      fs10.chown = chownFix(fs10.chown);
      fs10.fchown = chownFix(fs10.fchown);
      fs10.lchown = chownFix(fs10.lchown);
      fs10.chmod = chmodFix(fs10.chmod);
      fs10.fchmod = chmodFix(fs10.fchmod);
      fs10.lchmod = chmodFix(fs10.lchmod);
      fs10.chownSync = chownFixSync(fs10.chownSync);
      fs10.fchownSync = chownFixSync(fs10.fchownSync);
      fs10.lchownSync = chownFixSync(fs10.lchownSync);
      fs10.chmodSync = chmodFixSync(fs10.chmodSync);
      fs10.fchmodSync = chmodFixSync(fs10.fchmodSync);
      fs10.lchmodSync = chmodFixSync(fs10.lchmodSync);
      fs10.stat = statFix(fs10.stat);
      fs10.fstat = statFix(fs10.fstat);
      fs10.lstat = statFix(fs10.lstat);
      fs10.statSync = statFixSync(fs10.statSync);
      fs10.fstatSync = statFixSync(fs10.fstatSync);
      fs10.lstatSync = statFixSync(fs10.lstatSync);
      if (fs10.chmod && !fs10.lchmod) {
        fs10.lchmod = function(path10, mode, cb) {
          if (cb) process.nextTick(cb);
        };
        fs10.lchmodSync = function() {
        };
      }
      if (fs10.chown && !fs10.lchown) {
        fs10.lchown = function(path10, uid, gid, cb) {
          if (cb) process.nextTick(cb);
        };
        fs10.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs10.rename = typeof fs10.rename !== "function" ? fs10.rename : (function(fs$rename) {
          function rename(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs10.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb) cb(er);
            });
          }
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
          return rename;
        })(fs10.rename);
      }
      fs10.read = typeof fs10.read !== "function" ? fs10.read : (function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs10, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs10, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
        return read;
      })(fs10.read);
      fs10.readSync = typeof fs10.readSync !== "function" ? fs10.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs10, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs10.readSync);
      function patchLchmod(fs11) {
        fs11.lchmod = function(path10, mode, callback) {
          fs11.open(
            path10,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs11.fchmod(fd, mode, function(err2) {
                fs11.close(fd, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs11.lchmodSync = function(path10, mode) {
          var fd = fs11.openSync(path10, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs11.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs11.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs11.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs11) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs11.futimes) {
          fs11.lutimes = function(path10, at, mt, cb) {
            fs11.open(path10, constants.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb) cb(er);
                return;
              }
              fs11.futimes(fd, at, mt, function(er2) {
                fs11.close(fd, function(er22) {
                  if (cb) cb(er2 || er22);
                });
              });
            });
          };
          fs11.lutimesSync = function(path10, at, mt) {
            var fd = fs11.openSync(path10, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs11.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs11.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs11.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs11.futimes) {
          fs11.lutimes = function(_a, _b, _c, cb) {
            if (cb) process.nextTick(cb);
          };
          fs11.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb) {
          return orig.call(fs10, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs10, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs10, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs10, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig) return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            if (cb) cb.apply(this, arguments);
          }
          return options ? orig.call(fs10, target, options, callback) : orig.call(fs10, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs10, target, options) : orig.call(fs10, target);
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "node_modules/graceful-fs/legacy-streams.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs10) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path10, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path10, options);
        Stream.call(this);
        var self = this;
        this.path = path10;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding) this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self._read();
          });
          return;
        }
        fs10.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self.emit("error", err);
            self.readable = false;
            return;
          }
          self.fd = fd;
          self.emit("open", fd);
          self._read();
        });
      }
      function WriteStream(path10, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path10, options);
        Stream.call(this);
        this.path = path10;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs10.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "node_modules/graceful-fs/clone.js"(exports2, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "node_modules/graceful-fs/graceful-fs.js"(exports2, module2) {
    var fs10 = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = /* @__PURE__ */ Symbol.for("graceful-fs.queue");
      previousSymbol = /* @__PURE__ */ Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop2() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop2;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs10[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs10, queue);
      fs10.close = (function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs10, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      })(fs10.close);
      fs10.closeSync = (function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs10, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs10.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs10[gracefulQueue]);
          require("assert").equal(fs10[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs10[gracefulQueue]);
    }
    module2.exports = patch(clone(fs10));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs10.__patched) {
      module2.exports = patch(fs10);
      fs10.__patched = true;
    }
    function patch(fs11) {
      polyfills(fs11);
      fs11.gracefulify = patch;
      fs11.createReadStream = createReadStream;
      fs11.createWriteStream = createWriteStream;
      var fs$readFile = fs11.readFile;
      fs11.readFile = readFile;
      function readFile(path10, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path10, options, cb);
        function go$readFile(path11, options2, cb2, startTime) {
          return fs$readFile(path11, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path11, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs11.writeFile;
      fs11.writeFile = writeFile;
      function writeFile(path10, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path10, data, options, cb);
        function go$writeFile(path11, data2, options2, cb2, startTime) {
          return fs$writeFile(path11, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path11, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs11.appendFile;
      if (fs$appendFile)
        fs11.appendFile = appendFile;
      function appendFile(path10, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path10, data, options, cb);
        function go$appendFile(path11, data2, options2, cb2, startTime) {
          return fs$appendFile(path11, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path11, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs11.copyFile;
      if (fs$copyFile)
        fs11.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs11.readdir;
      fs11.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path10, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path11, options2, cb2, startTime) {
          return fs$readdir(path11, fs$readdirCallback(
            path11,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path11, options2, cb2, startTime) {
          return fs$readdir(path11, options2, fs$readdirCallback(
            path11,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path10, options, cb);
        function fs$readdirCallback(path11, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path11, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs11);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs11.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs11.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs11, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs11, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs11, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs11, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path10, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path10, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path10, options) {
        return new fs11.ReadStream(path10, options);
      }
      function createWriteStream(path10, options) {
        return new fs11.WriteStream(path10, options);
      }
      var fs$open = fs11.open;
      fs11.open = open;
      function open(path10, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path10, flags, mode, cb);
        function go$open(path11, flags2, mode2, cb2, startTime) {
          return fs$open(path11, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path11, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs11;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs10[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs10[gracefulQueue].length; ++i) {
        if (fs10[gracefulQueue][i].length > 2) {
          fs10[gracefulQueue][i][3] = now;
          fs10[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs10[gracefulQueue].length === 0)
        return;
      var elem = fs10[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs10[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// node_modules/fs-extra/lib/fs/index.js
var require_fs = __commonJS({
  "node_modules/fs-extra/lib/fs/index.js"(exports2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var fs10 = require_graceful_fs();
    var api = [
      "access",
      "appendFile",
      "chmod",
      "chown",
      "close",
      "copyFile",
      "cp",
      "fchmod",
      "fchown",
      "fdatasync",
      "fstat",
      "fsync",
      "ftruncate",
      "futimes",
      "glob",
      "lchmod",
      "lchown",
      "lutimes",
      "link",
      "lstat",
      "mkdir",
      "mkdtemp",
      "open",
      "opendir",
      "readdir",
      "readFile",
      "readlink",
      "realpath",
      "rename",
      "rm",
      "rmdir",
      "stat",
      "statfs",
      "symlink",
      "truncate",
      "unlink",
      "utimes",
      "writeFile"
    ].filter((key) => {
      return typeof fs10[key] === "function";
    });
    Object.assign(exports2, fs10);
    api.forEach((method) => {
      exports2[method] = u(fs10[method]);
    });
    exports2.exists = function(filename, callback) {
      if (typeof callback === "function") {
        return fs10.exists(filename, callback);
      }
      return new Promise((resolve) => {
        return fs10.exists(filename, resolve);
      });
    };
    exports2.read = function(fd, buffer, offset, length, position, callback) {
      if (typeof callback === "function") {
        return fs10.read(fd, buffer, offset, length, position, callback);
      }
      return new Promise((resolve, reject) => {
        fs10.read(fd, buffer, offset, length, position, (err, bytesRead, buffer2) => {
          if (err) return reject(err);
          resolve({ bytesRead, buffer: buffer2 });
        });
      });
    };
    exports2.write = function(fd, buffer, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs10.write(fd, buffer, ...args);
      }
      return new Promise((resolve, reject) => {
        fs10.write(fd, buffer, ...args, (err, bytesWritten, buffer2) => {
          if (err) return reject(err);
          resolve({ bytesWritten, buffer: buffer2 });
        });
      });
    };
    exports2.readv = function(fd, buffers, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs10.readv(fd, buffers, ...args);
      }
      return new Promise((resolve, reject) => {
        fs10.readv(fd, buffers, ...args, (err, bytesRead, buffers2) => {
          if (err) return reject(err);
          resolve({ bytesRead, buffers: buffers2 });
        });
      });
    };
    exports2.writev = function(fd, buffers, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs10.writev(fd, buffers, ...args);
      }
      return new Promise((resolve, reject) => {
        fs10.writev(fd, buffers, ...args, (err, bytesWritten, buffers2) => {
          if (err) return reject(err);
          resolve({ bytesWritten, buffers: buffers2 });
        });
      });
    };
    if (typeof fs10.realpath.native === "function") {
      exports2.realpath.native = u(fs10.realpath.native);
    } else {
      process.emitWarning(
        "fs.realpath.native is not a function. Is fs being monkey-patched?",
        "Warning",
        "fs-extra-WARN0003"
      );
    }
  }
});

// node_modules/fs-extra/lib/mkdirs/utils.js
var require_utils = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/utils.js"(exports2, module2) {
    "use strict";
    var path10 = require("path");
    module2.exports.checkPath = function checkPath(pth) {
      if (process.platform === "win32") {
        const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path10.parse(pth).root, ""));
        if (pathHasInvalidWinCharacters) {
          const error = new Error(`Path contains invalid characters: ${pth}`);
          error.code = "EINVAL";
          throw error;
        }
      }
    };
  }
});

// node_modules/fs-extra/lib/mkdirs/make-dir.js
var require_make_dir = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/make-dir.js"(exports2, module2) {
    "use strict";
    var fs10 = require_fs();
    var { checkPath } = require_utils();
    var getMode = (options) => {
      const defaults = { mode: 511 };
      if (typeof options === "number") return options;
      return { ...defaults, ...options }.mode;
    };
    module2.exports.makeDir = async (dir, options) => {
      checkPath(dir);
      return fs10.mkdir(dir, {
        mode: getMode(options),
        recursive: true
      });
    };
    module2.exports.makeDirSync = (dir, options) => {
      checkPath(dir);
      return fs10.mkdirSync(dir, {
        mode: getMode(options),
        recursive: true
      });
    };
  }
});

// node_modules/fs-extra/lib/mkdirs/index.js
var require_mkdirs = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var { makeDir: _makeDir, makeDirSync } = require_make_dir();
    var makeDir = u(_makeDir);
    module2.exports = {
      mkdirs: makeDir,
      mkdirsSync: makeDirSync,
      // alias
      mkdirp: makeDir,
      mkdirpSync: makeDirSync,
      ensureDir: makeDir,
      ensureDirSync: makeDirSync
    };
  }
});

// node_modules/fs-extra/lib/path-exists/index.js
var require_path_exists = __commonJS({
  "node_modules/fs-extra/lib/path-exists/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs10 = require_fs();
    function pathExists2(path10) {
      return fs10.access(path10).then(() => true).catch(() => false);
    }
    module2.exports = {
      pathExists: u(pathExists2),
      pathExistsSync: fs10.existsSync
    };
  }
});

// node_modules/fs-extra/lib/util/utimes.js
var require_utimes = __commonJS({
  "node_modules/fs-extra/lib/util/utimes.js"(exports2, module2) {
    "use strict";
    var fs10 = require_fs();
    var u = require_universalify().fromPromise;
    async function utimesMillis(path10, atime, mtime) {
      const fd = await fs10.open(path10, "r+");
      let closeErr = null;
      try {
        await fs10.futimes(fd, atime, mtime);
      } finally {
        try {
          await fs10.close(fd);
        } catch (e) {
          closeErr = e;
        }
      }
      if (closeErr) {
        throw closeErr;
      }
    }
    function utimesMillisSync(path10, atime, mtime) {
      const fd = fs10.openSync(path10, "r+");
      fs10.futimesSync(fd, atime, mtime);
      return fs10.closeSync(fd);
    }
    module2.exports = {
      utimesMillis: u(utimesMillis),
      utimesMillisSync
    };
  }
});

// node_modules/fs-extra/lib/util/stat.js
var require_stat = __commonJS({
  "node_modules/fs-extra/lib/util/stat.js"(exports2, module2) {
    "use strict";
    var fs10 = require_fs();
    var path10 = require("path");
    var u = require_universalify().fromPromise;
    function getStats(src, dest, opts) {
      const statFunc = opts.dereference ? (file) => fs10.stat(file, { bigint: true }) : (file) => fs10.lstat(file, { bigint: true });
      return Promise.all([
        statFunc(src),
        statFunc(dest).catch((err) => {
          if (err.code === "ENOENT") return null;
          throw err;
        })
      ]).then(([srcStat, destStat]) => ({ srcStat, destStat }));
    }
    function getStatsSync(src, dest, opts) {
      let destStat;
      const statFunc = opts.dereference ? (file) => fs10.statSync(file, { bigint: true }) : (file) => fs10.lstatSync(file, { bigint: true });
      const srcStat = statFunc(src);
      try {
        destStat = statFunc(dest);
      } catch (err) {
        if (err.code === "ENOENT") return { srcStat, destStat: null };
        throw err;
      }
      return { srcStat, destStat };
    }
    async function checkPaths(src, dest, funcName, opts) {
      const { srcStat, destStat } = await getStats(src, dest, opts);
      if (destStat) {
        if (areIdentical(srcStat, destStat)) {
          const srcBaseName = path10.basename(src);
          const destBaseName = path10.basename(dest);
          if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
            return { srcStat, destStat, isChangingCase: true };
          }
          throw new Error("Source and destination must not be the same.");
        }
        if (srcStat.isDirectory() && !destStat.isDirectory()) {
          throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
        }
        if (!srcStat.isDirectory() && destStat.isDirectory()) {
          throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
        }
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return { srcStat, destStat };
    }
    function checkPathsSync(src, dest, funcName, opts) {
      const { srcStat, destStat } = getStatsSync(src, dest, opts);
      if (destStat) {
        if (areIdentical(srcStat, destStat)) {
          const srcBaseName = path10.basename(src);
          const destBaseName = path10.basename(dest);
          if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
            return { srcStat, destStat, isChangingCase: true };
          }
          throw new Error("Source and destination must not be the same.");
        }
        if (srcStat.isDirectory() && !destStat.isDirectory()) {
          throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
        }
        if (!srcStat.isDirectory() && destStat.isDirectory()) {
          throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
        }
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return { srcStat, destStat };
    }
    async function checkParentPaths(src, srcStat, dest, funcName) {
      const srcParent = path10.resolve(path10.dirname(src));
      const destParent = path10.resolve(path10.dirname(dest));
      if (destParent === srcParent || destParent === path10.parse(destParent).root) return;
      let destStat;
      try {
        destStat = await fs10.stat(destParent, { bigint: true });
      } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
      }
      if (areIdentical(srcStat, destStat)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return checkParentPaths(src, srcStat, destParent, funcName);
    }
    function checkParentPathsSync(src, srcStat, dest, funcName) {
      const srcParent = path10.resolve(path10.dirname(src));
      const destParent = path10.resolve(path10.dirname(dest));
      if (destParent === srcParent || destParent === path10.parse(destParent).root) return;
      let destStat;
      try {
        destStat = fs10.statSync(destParent, { bigint: true });
      } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
      }
      if (areIdentical(srcStat, destStat)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return checkParentPathsSync(src, srcStat, destParent, funcName);
    }
    function areIdentical(srcStat, destStat) {
      return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
    }
    function isSrcSubdir(src, dest) {
      const srcArr = path10.resolve(src).split(path10.sep).filter((i) => i);
      const destArr = path10.resolve(dest).split(path10.sep).filter((i) => i);
      return srcArr.every((cur, i) => destArr[i] === cur);
    }
    function errMsg(src, dest, funcName) {
      return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
    }
    module2.exports = {
      // checkPaths
      checkPaths: u(checkPaths),
      checkPathsSync,
      // checkParent
      checkParentPaths: u(checkParentPaths),
      checkParentPathsSync,
      // Misc
      isSrcSubdir,
      areIdentical
    };
  }
});

// node_modules/fs-extra/lib/copy/copy.js
var require_copy = __commonJS({
  "node_modules/fs-extra/lib/copy/copy.js"(exports2, module2) {
    "use strict";
    var fs10 = require_fs();
    var path10 = require("path");
    var { mkdirs } = require_mkdirs();
    var { pathExists: pathExists2 } = require_path_exists();
    var { utimesMillis } = require_utimes();
    var stat = require_stat();
    async function copy(src, dest, opts = {}) {
      if (typeof opts === "function") {
        opts = { filter: opts };
      }
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        process.emitWarning(
          "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
          "Warning",
          "fs-extra-WARN0001"
        );
      }
      const { srcStat, destStat } = await stat.checkPaths(src, dest, "copy", opts);
      await stat.checkParentPaths(src, srcStat, dest, "copy");
      const include = await runFilter(src, dest, opts);
      if (!include) return;
      const destParent = path10.dirname(dest);
      const dirExists = await pathExists2(destParent);
      if (!dirExists) {
        await mkdirs(destParent);
      }
      await getStatsAndPerformCopy(destStat, src, dest, opts);
    }
    async function runFilter(src, dest, opts) {
      if (!opts.filter) return true;
      return opts.filter(src, dest);
    }
    async function getStatsAndPerformCopy(destStat, src, dest, opts) {
      const statFn = opts.dereference ? fs10.stat : fs10.lstat;
      const srcStat = await statFn(src);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
      if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
      if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
      if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
      if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
      throw new Error(`Unknown file: ${src}`);
    }
    async function onFile(srcStat, destStat, src, dest, opts) {
      if (!destStat) return copyFile(srcStat, src, dest, opts);
      if (opts.overwrite) {
        await fs10.unlink(dest);
        return copyFile(srcStat, src, dest, opts);
      }
      if (opts.errorOnExist) {
        throw new Error(`'${dest}' already exists`);
      }
    }
    async function copyFile(srcStat, src, dest, opts) {
      await fs10.copyFile(src, dest);
      if (opts.preserveTimestamps) {
        if (fileIsNotWritable(srcStat.mode)) {
          await makeFileWritable(dest, srcStat.mode);
        }
        const updatedSrcStat = await fs10.stat(src);
        await utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
      }
      return fs10.chmod(dest, srcStat.mode);
    }
    function fileIsNotWritable(srcMode) {
      return (srcMode & 128) === 0;
    }
    function makeFileWritable(dest, srcMode) {
      return fs10.chmod(dest, srcMode | 128);
    }
    async function onDir(srcStat, destStat, src, dest, opts) {
      if (!destStat) {
        await fs10.mkdir(dest);
      }
      const promises = [];
      for await (const item of await fs10.opendir(src)) {
        const srcItem = path10.join(src, item.name);
        const destItem = path10.join(dest, item.name);
        promises.push(
          runFilter(srcItem, destItem, opts).then((include) => {
            if (include) {
              return stat.checkPaths(srcItem, destItem, "copy", opts).then(({ destStat: destStat2 }) => {
                return getStatsAndPerformCopy(destStat2, srcItem, destItem, opts);
              });
            }
          })
        );
      }
      await Promise.all(promises);
      if (!destStat) {
        await fs10.chmod(dest, srcStat.mode);
      }
    }
    async function onLink(destStat, src, dest, opts) {
      let resolvedSrc = await fs10.readlink(src);
      if (opts.dereference) {
        resolvedSrc = path10.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs10.symlink(resolvedSrc, dest);
      }
      let resolvedDest = null;
      try {
        resolvedDest = await fs10.readlink(dest);
      } catch (e) {
        if (e.code === "EINVAL" || e.code === "UNKNOWN") return fs10.symlink(resolvedSrc, dest);
        throw e;
      }
      if (opts.dereference) {
        resolvedDest = path10.resolve(process.cwd(), resolvedDest);
      }
      if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
        throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
      }
      if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
        throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
      }
      await fs10.unlink(dest);
      return fs10.symlink(resolvedSrc, dest);
    }
    module2.exports = copy;
  }
});

// node_modules/fs-extra/lib/copy/copy-sync.js
var require_copy_sync = __commonJS({
  "node_modules/fs-extra/lib/copy/copy-sync.js"(exports2, module2) {
    "use strict";
    var fs10 = require_graceful_fs();
    var path10 = require("path");
    var mkdirsSync = require_mkdirs().mkdirsSync;
    var utimesMillisSync = require_utimes().utimesMillisSync;
    var stat = require_stat();
    function copySync(src, dest, opts) {
      if (typeof opts === "function") {
        opts = { filter: opts };
      }
      opts = opts || {};
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        process.emitWarning(
          "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
          "Warning",
          "fs-extra-WARN0002"
        );
      }
      const { srcStat, destStat } = stat.checkPathsSync(src, dest, "copy", opts);
      stat.checkParentPathsSync(src, srcStat, dest, "copy");
      if (opts.filter && !opts.filter(src, dest)) return;
      const destParent = path10.dirname(dest);
      if (!fs10.existsSync(destParent)) mkdirsSync(destParent);
      return getStats(destStat, src, dest, opts);
    }
    function getStats(destStat, src, dest, opts) {
      const statSync = opts.dereference ? fs10.statSync : fs10.lstatSync;
      const srcStat = statSync(src);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
      else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
      else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
      else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
      else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
      throw new Error(`Unknown file: ${src}`);
    }
    function onFile(srcStat, destStat, src, dest, opts) {
      if (!destStat) return copyFile(srcStat, src, dest, opts);
      return mayCopyFile(srcStat, src, dest, opts);
    }
    function mayCopyFile(srcStat, src, dest, opts) {
      if (opts.overwrite) {
        fs10.unlinkSync(dest);
        return copyFile(srcStat, src, dest, opts);
      } else if (opts.errorOnExist) {
        throw new Error(`'${dest}' already exists`);
      }
    }
    function copyFile(srcStat, src, dest, opts) {
      fs10.copyFileSync(src, dest);
      if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
      return setDestMode(dest, srcStat.mode);
    }
    function handleTimestamps(srcMode, src, dest) {
      if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
      return setDestTimestamps(src, dest);
    }
    function fileIsNotWritable(srcMode) {
      return (srcMode & 128) === 0;
    }
    function makeFileWritable(dest, srcMode) {
      return setDestMode(dest, srcMode | 128);
    }
    function setDestMode(dest, srcMode) {
      return fs10.chmodSync(dest, srcMode);
    }
    function setDestTimestamps(src, dest) {
      const updatedSrcStat = fs10.statSync(src);
      return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
    }
    function onDir(srcStat, destStat, src, dest, opts) {
      if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts);
      return copyDir(src, dest, opts);
    }
    function mkDirAndCopy(srcMode, src, dest, opts) {
      fs10.mkdirSync(dest);
      copyDir(src, dest, opts);
      return setDestMode(dest, srcMode);
    }
    function copyDir(src, dest, opts) {
      const dir = fs10.opendirSync(src);
      try {
        let dirent;
        while ((dirent = dir.readSync()) !== null) {
          copyDirItem(dirent.name, src, dest, opts);
        }
      } finally {
        dir.closeSync();
      }
    }
    function copyDirItem(item, src, dest, opts) {
      const srcItem = path10.join(src, item);
      const destItem = path10.join(dest, item);
      if (opts.filter && !opts.filter(srcItem, destItem)) return;
      const { destStat } = stat.checkPathsSync(srcItem, destItem, "copy", opts);
      return getStats(destStat, srcItem, destItem, opts);
    }
    function onLink(destStat, src, dest, opts) {
      let resolvedSrc = fs10.readlinkSync(src);
      if (opts.dereference) {
        resolvedSrc = path10.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs10.symlinkSync(resolvedSrc, dest);
      } else {
        let resolvedDest;
        try {
          resolvedDest = fs10.readlinkSync(dest);
        } catch (err) {
          if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs10.symlinkSync(resolvedSrc, dest);
          throw err;
        }
        if (opts.dereference) {
          resolvedDest = path10.resolve(process.cwd(), resolvedDest);
        }
        if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
          throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
        }
        if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
          throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
        }
        return copyLink(resolvedSrc, dest);
      }
    }
    function copyLink(resolvedSrc, dest) {
      fs10.unlinkSync(dest);
      return fs10.symlinkSync(resolvedSrc, dest);
    }
    module2.exports = copySync;
  }
});

// node_modules/fs-extra/lib/copy/index.js
var require_copy2 = __commonJS({
  "node_modules/fs-extra/lib/copy/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    module2.exports = {
      copy: u(require_copy()),
      copySync: require_copy_sync()
    };
  }
});

// node_modules/fs-extra/lib/remove/index.js
var require_remove = __commonJS({
  "node_modules/fs-extra/lib/remove/index.js"(exports2, module2) {
    "use strict";
    var fs10 = require_graceful_fs();
    var u = require_universalify().fromCallback;
    function remove(path10, callback) {
      fs10.rm(path10, { recursive: true, force: true }, callback);
    }
    function removeSync(path10) {
      fs10.rmSync(path10, { recursive: true, force: true });
    }
    module2.exports = {
      remove: u(remove),
      removeSync
    };
  }
});

// node_modules/fs-extra/lib/empty/index.js
var require_empty = __commonJS({
  "node_modules/fs-extra/lib/empty/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs10 = require_fs();
    var path10 = require("path");
    var mkdir = require_mkdirs();
    var remove = require_remove();
    var emptyDir = u(async function emptyDir2(dir) {
      let items;
      try {
        items = await fs10.readdir(dir);
      } catch {
        return mkdir.mkdirs(dir);
      }
      return Promise.all(items.map((item) => remove.remove(path10.join(dir, item))));
    });
    function emptyDirSync(dir) {
      let items;
      try {
        items = fs10.readdirSync(dir);
      } catch {
        return mkdir.mkdirsSync(dir);
      }
      items.forEach((item) => {
        item = path10.join(dir, item);
        remove.removeSync(item);
      });
    }
    module2.exports = {
      emptyDirSync,
      emptydirSync: emptyDirSync,
      emptyDir,
      emptydir: emptyDir
    };
  }
});

// node_modules/fs-extra/lib/ensure/file.js
var require_file = __commonJS({
  "node_modules/fs-extra/lib/ensure/file.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var path10 = require("path");
    var fs10 = require_fs();
    var mkdir = require_mkdirs();
    async function createFile(file) {
      let stats;
      try {
        stats = await fs10.stat(file);
      } catch {
      }
      if (stats && stats.isFile()) return;
      const dir = path10.dirname(file);
      let dirStats = null;
      try {
        dirStats = await fs10.stat(dir);
      } catch (err) {
        if (err.code === "ENOENT") {
          await mkdir.mkdirs(dir);
          await fs10.writeFile(file, "");
          return;
        } else {
          throw err;
        }
      }
      if (dirStats.isDirectory()) {
        await fs10.writeFile(file, "");
      } else {
        await fs10.readdir(dir);
      }
    }
    function createFileSync(file) {
      let stats;
      try {
        stats = fs10.statSync(file);
      } catch {
      }
      if (stats && stats.isFile()) return;
      const dir = path10.dirname(file);
      try {
        if (!fs10.statSync(dir).isDirectory()) {
          fs10.readdirSync(dir);
        }
      } catch (err) {
        if (err && err.code === "ENOENT") mkdir.mkdirsSync(dir);
        else throw err;
      }
      fs10.writeFileSync(file, "");
    }
    module2.exports = {
      createFile: u(createFile),
      createFileSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/link.js
var require_link = __commonJS({
  "node_modules/fs-extra/lib/ensure/link.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var path10 = require("path");
    var fs10 = require_fs();
    var mkdir = require_mkdirs();
    var { pathExists: pathExists2 } = require_path_exists();
    var { areIdentical } = require_stat();
    async function createLink(srcpath, dstpath) {
      let dstStat;
      try {
        dstStat = await fs10.lstat(dstpath);
      } catch {
      }
      let srcStat;
      try {
        srcStat = await fs10.lstat(srcpath);
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
      }
      if (dstStat && areIdentical(srcStat, dstStat)) return;
      const dir = path10.dirname(dstpath);
      const dirExists = await pathExists2(dir);
      if (!dirExists) {
        await mkdir.mkdirs(dir);
      }
      await fs10.link(srcpath, dstpath);
    }
    function createLinkSync(srcpath, dstpath) {
      let dstStat;
      try {
        dstStat = fs10.lstatSync(dstpath);
      } catch {
      }
      try {
        const srcStat = fs10.lstatSync(srcpath);
        if (dstStat && areIdentical(srcStat, dstStat)) return;
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
      }
      const dir = path10.dirname(dstpath);
      const dirExists = fs10.existsSync(dir);
      if (dirExists) return fs10.linkSync(srcpath, dstpath);
      mkdir.mkdirsSync(dir);
      return fs10.linkSync(srcpath, dstpath);
    }
    module2.exports = {
      createLink: u(createLink),
      createLinkSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink-paths.js
var require_symlink_paths = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink-paths.js"(exports2, module2) {
    "use strict";
    var path10 = require("path");
    var fs10 = require_fs();
    var { pathExists: pathExists2 } = require_path_exists();
    var u = require_universalify().fromPromise;
    async function symlinkPaths(srcpath, dstpath) {
      if (path10.isAbsolute(srcpath)) {
        try {
          await fs10.lstat(srcpath);
        } catch (err) {
          err.message = err.message.replace("lstat", "ensureSymlink");
          throw err;
        }
        return {
          toCwd: srcpath,
          toDst: srcpath
        };
      }
      const dstdir = path10.dirname(dstpath);
      const relativeToDst = path10.join(dstdir, srcpath);
      const exists = await pathExists2(relativeToDst);
      if (exists) {
        return {
          toCwd: relativeToDst,
          toDst: srcpath
        };
      }
      try {
        await fs10.lstat(srcpath);
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureSymlink");
        throw err;
      }
      return {
        toCwd: srcpath,
        toDst: path10.relative(dstdir, srcpath)
      };
    }
    function symlinkPathsSync(srcpath, dstpath) {
      if (path10.isAbsolute(srcpath)) {
        const exists2 = fs10.existsSync(srcpath);
        if (!exists2) throw new Error("absolute srcpath does not exist");
        return {
          toCwd: srcpath,
          toDst: srcpath
        };
      }
      const dstdir = path10.dirname(dstpath);
      const relativeToDst = path10.join(dstdir, srcpath);
      const exists = fs10.existsSync(relativeToDst);
      if (exists) {
        return {
          toCwd: relativeToDst,
          toDst: srcpath
        };
      }
      const srcExists = fs10.existsSync(srcpath);
      if (!srcExists) throw new Error("relative srcpath does not exist");
      return {
        toCwd: srcpath,
        toDst: path10.relative(dstdir, srcpath)
      };
    }
    module2.exports = {
      symlinkPaths: u(symlinkPaths),
      symlinkPathsSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink-type.js
var require_symlink_type = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink-type.js"(exports2, module2) {
    "use strict";
    var fs10 = require_fs();
    var u = require_universalify().fromPromise;
    async function symlinkType(srcpath, type) {
      if (type) return type;
      let stats;
      try {
        stats = await fs10.lstat(srcpath);
      } catch {
        return "file";
      }
      return stats && stats.isDirectory() ? "dir" : "file";
    }
    function symlinkTypeSync(srcpath, type) {
      if (type) return type;
      let stats;
      try {
        stats = fs10.lstatSync(srcpath);
      } catch {
        return "file";
      }
      return stats && stats.isDirectory() ? "dir" : "file";
    }
    module2.exports = {
      symlinkType: u(symlinkType),
      symlinkTypeSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink.js
var require_symlink = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var path10 = require("path");
    var fs10 = require_fs();
    var { mkdirs, mkdirsSync } = require_mkdirs();
    var { symlinkPaths, symlinkPathsSync } = require_symlink_paths();
    var { symlinkType, symlinkTypeSync } = require_symlink_type();
    var { pathExists: pathExists2 } = require_path_exists();
    var { areIdentical } = require_stat();
    async function createSymlink(srcpath, dstpath, type) {
      let stats;
      try {
        stats = await fs10.lstat(dstpath);
      } catch {
      }
      if (stats && stats.isSymbolicLink()) {
        const [srcStat, dstStat] = await Promise.all([
          fs10.stat(srcpath),
          fs10.stat(dstpath)
        ]);
        if (areIdentical(srcStat, dstStat)) return;
      }
      const relative = await symlinkPaths(srcpath, dstpath);
      srcpath = relative.toDst;
      const toType = await symlinkType(relative.toCwd, type);
      const dir = path10.dirname(dstpath);
      if (!await pathExists2(dir)) {
        await mkdirs(dir);
      }
      return fs10.symlink(srcpath, dstpath, toType);
    }
    function createSymlinkSync(srcpath, dstpath, type) {
      let stats;
      try {
        stats = fs10.lstatSync(dstpath);
      } catch {
      }
      if (stats && stats.isSymbolicLink()) {
        const srcStat = fs10.statSync(srcpath);
        const dstStat = fs10.statSync(dstpath);
        if (areIdentical(srcStat, dstStat)) return;
      }
      const relative = symlinkPathsSync(srcpath, dstpath);
      srcpath = relative.toDst;
      type = symlinkTypeSync(relative.toCwd, type);
      const dir = path10.dirname(dstpath);
      const exists = fs10.existsSync(dir);
      if (exists) return fs10.symlinkSync(srcpath, dstpath, type);
      mkdirsSync(dir);
      return fs10.symlinkSync(srcpath, dstpath, type);
    }
    module2.exports = {
      createSymlink: u(createSymlink),
      createSymlinkSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/index.js
var require_ensure = __commonJS({
  "node_modules/fs-extra/lib/ensure/index.js"(exports2, module2) {
    "use strict";
    var { createFile, createFileSync } = require_file();
    var { createLink, createLinkSync } = require_link();
    var { createSymlink, createSymlinkSync } = require_symlink();
    module2.exports = {
      // file
      createFile,
      createFileSync,
      ensureFile: createFile,
      ensureFileSync: createFileSync,
      // link
      createLink,
      createLinkSync,
      ensureLink: createLink,
      ensureLinkSync: createLinkSync,
      // symlink
      createSymlink,
      createSymlinkSync,
      ensureSymlink: createSymlink,
      ensureSymlinkSync: createSymlinkSync
    };
  }
});

// node_modules/jsonfile/utils.js
var require_utils2 = __commonJS({
  "node_modules/jsonfile/utils.js"(exports2, module2) {
    function stringify(obj, { EOL = "\n", finalEOL = true, replacer = null, spaces } = {}) {
      const EOF = finalEOL ? EOL : "";
      const str = JSON.stringify(obj, replacer, spaces);
      return str.replace(/\n/g, EOL) + EOF;
    }
    function stripBom(content) {
      if (Buffer.isBuffer(content)) content = content.toString("utf8");
      return content.replace(/^\uFEFF/, "");
    }
    module2.exports = { stringify, stripBom };
  }
});

// node_modules/jsonfile/index.js
var require_jsonfile = __commonJS({
  "node_modules/jsonfile/index.js"(exports2, module2) {
    var _fs;
    try {
      _fs = require_graceful_fs();
    } catch (_) {
      _fs = require("fs");
    }
    var universalify = require_universalify();
    var { stringify, stripBom } = require_utils2();
    async function _readFile(file, options = {}) {
      if (typeof options === "string") {
        options = { encoding: options };
      }
      const fs10 = options.fs || _fs;
      const shouldThrow = "throws" in options ? options.throws : true;
      let data = await universalify.fromCallback(fs10.readFile)(file, options);
      data = stripBom(data);
      let obj;
      try {
        obj = JSON.parse(data, options ? options.reviver : null);
      } catch (err) {
        if (shouldThrow) {
          err.message = `${file}: ${err.message}`;
          throw err;
        } else {
          return null;
        }
      }
      return obj;
    }
    var readFile = universalify.fromPromise(_readFile);
    function readFileSync(file, options = {}) {
      if (typeof options === "string") {
        options = { encoding: options };
      }
      const fs10 = options.fs || _fs;
      const shouldThrow = "throws" in options ? options.throws : true;
      try {
        let content = fs10.readFileSync(file, options);
        content = stripBom(content);
        return JSON.parse(content, options.reviver);
      } catch (err) {
        if (shouldThrow) {
          err.message = `${file}: ${err.message}`;
          throw err;
        } else {
          return null;
        }
      }
    }
    async function _writeFile(file, obj, options = {}) {
      const fs10 = options.fs || _fs;
      const str = stringify(obj, options);
      await universalify.fromCallback(fs10.writeFile)(file, str, options);
    }
    var writeFile = universalify.fromPromise(_writeFile);
    function writeFileSync(file, obj, options = {}) {
      const fs10 = options.fs || _fs;
      const str = stringify(obj, options);
      return fs10.writeFileSync(file, str, options);
    }
    var jsonfile = {
      readFile,
      readFileSync,
      writeFile,
      writeFileSync
    };
    module2.exports = jsonfile;
  }
});

// node_modules/fs-extra/lib/json/jsonfile.js
var require_jsonfile2 = __commonJS({
  "node_modules/fs-extra/lib/json/jsonfile.js"(exports2, module2) {
    "use strict";
    var jsonFile = require_jsonfile();
    module2.exports = {
      // jsonfile exports
      readJson: jsonFile.readFile,
      readJsonSync: jsonFile.readFileSync,
      writeJson: jsonFile.writeFile,
      writeJsonSync: jsonFile.writeFileSync
    };
  }
});

// node_modules/fs-extra/lib/output-file/index.js
var require_output_file = __commonJS({
  "node_modules/fs-extra/lib/output-file/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs10 = require_fs();
    var path10 = require("path");
    var mkdir = require_mkdirs();
    var pathExists2 = require_path_exists().pathExists;
    async function outputFile(file, data, encoding = "utf-8") {
      const dir = path10.dirname(file);
      if (!await pathExists2(dir)) {
        await mkdir.mkdirs(dir);
      }
      return fs10.writeFile(file, data, encoding);
    }
    function outputFileSync(file, ...args) {
      const dir = path10.dirname(file);
      if (!fs10.existsSync(dir)) {
        mkdir.mkdirsSync(dir);
      }
      fs10.writeFileSync(file, ...args);
    }
    module2.exports = {
      outputFile: u(outputFile),
      outputFileSync
    };
  }
});

// node_modules/fs-extra/lib/json/output-json.js
var require_output_json = __commonJS({
  "node_modules/fs-extra/lib/json/output-json.js"(exports2, module2) {
    "use strict";
    var { stringify } = require_utils2();
    var { outputFile } = require_output_file();
    async function outputJson(file, data, options = {}) {
      const str = stringify(data, options);
      await outputFile(file, str, options);
    }
    module2.exports = outputJson;
  }
});

// node_modules/fs-extra/lib/json/output-json-sync.js
var require_output_json_sync = __commonJS({
  "node_modules/fs-extra/lib/json/output-json-sync.js"(exports2, module2) {
    "use strict";
    var { stringify } = require_utils2();
    var { outputFileSync } = require_output_file();
    function outputJsonSync(file, data, options) {
      const str = stringify(data, options);
      outputFileSync(file, str, options);
    }
    module2.exports = outputJsonSync;
  }
});

// node_modules/fs-extra/lib/json/index.js
var require_json = __commonJS({
  "node_modules/fs-extra/lib/json/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var jsonFile = require_jsonfile2();
    jsonFile.outputJson = u(require_output_json());
    jsonFile.outputJsonSync = require_output_json_sync();
    jsonFile.outputJSON = jsonFile.outputJson;
    jsonFile.outputJSONSync = jsonFile.outputJsonSync;
    jsonFile.writeJSON = jsonFile.writeJson;
    jsonFile.writeJSONSync = jsonFile.writeJsonSync;
    jsonFile.readJSON = jsonFile.readJson;
    jsonFile.readJSONSync = jsonFile.readJsonSync;
    module2.exports = jsonFile;
  }
});

// node_modules/fs-extra/lib/move/move.js
var require_move = __commonJS({
  "node_modules/fs-extra/lib/move/move.js"(exports2, module2) {
    "use strict";
    var fs10 = require_fs();
    var path10 = require("path");
    var { copy } = require_copy2();
    var { remove } = require_remove();
    var { mkdirp } = require_mkdirs();
    var { pathExists: pathExists2 } = require_path_exists();
    var stat = require_stat();
    async function move(src, dest, opts = {}) {
      const overwrite = opts.overwrite || opts.clobber || false;
      const { srcStat, isChangingCase = false } = await stat.checkPaths(src, dest, "move", opts);
      await stat.checkParentPaths(src, srcStat, dest, "move");
      const destParent = path10.dirname(dest);
      const parsedParentPath = path10.parse(destParent);
      if (parsedParentPath.root !== destParent) {
        await mkdirp(destParent);
      }
      return doRename(src, dest, overwrite, isChangingCase);
    }
    async function doRename(src, dest, overwrite, isChangingCase) {
      if (!isChangingCase) {
        if (overwrite) {
          await remove(dest);
        } else if (await pathExists2(dest)) {
          throw new Error("dest already exists.");
        }
      }
      try {
        await fs10.rename(src, dest);
      } catch (err) {
        if (err.code !== "EXDEV") {
          throw err;
        }
        await moveAcrossDevice(src, dest, overwrite);
      }
    }
    async function moveAcrossDevice(src, dest, overwrite) {
      const opts = {
        overwrite,
        errorOnExist: true,
        preserveTimestamps: true
      };
      await copy(src, dest, opts);
      return remove(src);
    }
    module2.exports = move;
  }
});

// node_modules/fs-extra/lib/move/move-sync.js
var require_move_sync = __commonJS({
  "node_modules/fs-extra/lib/move/move-sync.js"(exports2, module2) {
    "use strict";
    var fs10 = require_graceful_fs();
    var path10 = require("path");
    var copySync = require_copy2().copySync;
    var removeSync = require_remove().removeSync;
    var mkdirpSync = require_mkdirs().mkdirpSync;
    var stat = require_stat();
    function moveSync(src, dest, opts) {
      opts = opts || {};
      const overwrite = opts.overwrite || opts.clobber || false;
      const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, "move", opts);
      stat.checkParentPathsSync(src, srcStat, dest, "move");
      if (!isParentRoot(dest)) mkdirpSync(path10.dirname(dest));
      return doRename(src, dest, overwrite, isChangingCase);
    }
    function isParentRoot(dest) {
      const parent = path10.dirname(dest);
      const parsedPath = path10.parse(parent);
      return parsedPath.root === parent;
    }
    function doRename(src, dest, overwrite, isChangingCase) {
      if (isChangingCase) return rename(src, dest, overwrite);
      if (overwrite) {
        removeSync(dest);
        return rename(src, dest, overwrite);
      }
      if (fs10.existsSync(dest)) throw new Error("dest already exists.");
      return rename(src, dest, overwrite);
    }
    function rename(src, dest, overwrite) {
      try {
        fs10.renameSync(src, dest);
      } catch (err) {
        if (err.code !== "EXDEV") throw err;
        return moveAcrossDevice(src, dest, overwrite);
      }
    }
    function moveAcrossDevice(src, dest, overwrite) {
      const opts = {
        overwrite,
        errorOnExist: true,
        preserveTimestamps: true
      };
      copySync(src, dest, opts);
      return removeSync(src);
    }
    module2.exports = moveSync;
  }
});

// node_modules/fs-extra/lib/move/index.js
var require_move2 = __commonJS({
  "node_modules/fs-extra/lib/move/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    module2.exports = {
      move: u(require_move()),
      moveSync: require_move_sync()
    };
  }
});

// node_modules/fs-extra/lib/index.js
var require_lib = __commonJS({
  "node_modules/fs-extra/lib/index.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      // Export promiseified graceful-fs:
      ...require_fs(),
      // Export extra methods:
      ...require_copy2(),
      ...require_empty(),
      ...require_ensure(),
      ...require_json(),
      ...require_mkdirs(),
      ...require_move2(),
      ...require_output_file(),
      ...require_path_exists(),
      ...require_remove()
    };
  }
});

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// src/cli.ts
var fs9 = __toESM(require_lib());
var path9 = __toESM(require("path"));
var readline = __toESM(require("readline"));

// src/generators/context.ts
var import_fs_extra = __toESM(require_lib());
var import_path = __toESM(require("path"));
var import_crypto = __toESM(require("crypto"));
var FRAMEWORKS = ["express", "elysia"];
var DATABASES = ["mongodb", "postgres"];
var FIELD_TYPES = ["String", "Number", "Date", "Boolean", "ObjectId", "Array", "Mixed", "JSON"];
var GeneratorError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "GeneratorError";
  }
};
var assertValidName = (value, pattern, what) => {
  if (!pattern.test(value)) {
    throw new GeneratorError("INVALID_INPUT", `Invalid ${what}: "${value}" (must match ${pattern})`);
  }
};
var capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
var toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
var toKebabCase = (str) => str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var toUpperSnakeCase = (str) => str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
var generateSecret = (bytes = 64) => import_crypto.default.randomBytes(bytes).toString("hex");
var packageRoot = () => {
  const candidates = [import_path.default.join(__dirname, ".."), import_path.default.join(__dirname, "..", "..")];
  for (const c of candidates) {
    if (import_fs_extra.default.existsSync(import_path.default.join(c, "templates"))) return c;
  }
  throw new GeneratorError("IO_ERROR", "Could not locate koti package root (no templates/ directory found)");
};
var templatesDir = () => import_path.default.join(packageRoot(), "templates");
var getVersion = () => {
  const candidates = [
    import_path.default.join(__dirname, "..", "version.json"),
    import_path.default.join(__dirname, "..", "package.json"),
    import_path.default.join(__dirname, "..", "..", "version.json"),
    import_path.default.join(__dirname, "..", "..", "package.json")
  ];
  for (const candidate of candidates) {
    try {
      const data = JSON.parse(import_fs_extra.default.readFileSync(candidate, "utf8"));
      if (data.version) return data.version;
    } catch {
    }
  }
  return "0.0.0-unknown";
};
var resolveProject = async (root) => {
  const warnings = [];
  const pkgPath = import_path.default.join(root, "package.json");
  if (!await import_fs_extra.default.pathExists(pkgPath)) {
    throw new GeneratorError("NOT_KOTI_PROJECT", `${root} is not a Koti project (no package.json)`);
  }
  const configPath = import_path.default.join(root, "koti.config.json");
  if (await import_fs_extra.default.pathExists(configPath)) {
    try {
      const config = await import_fs_extra.default.readJson(configPath);
      let framework = "express";
      if (config.framework === "express" || config.framework === "elysia") {
        framework = config.framework;
      } else {
        warnings.push(`Unknown framework "${config.framework}" in koti.config.json \u2014 defaulting to express`);
      }
      let database2;
      if (config.database === void 0) {
        database2 = "mongodb";
        warnings.push('koti.config.json has no "database" key (pre-3.2 project) \u2014 assuming mongodb. Run koti db:switch or add the key to silence this.');
      } else if (!DATABASES.includes(config.database)) {
        throw new GeneratorError("UNSUPPORTED_DATABASE", `Unknown database "${config.database}" in koti.config.json. Supported: ${DATABASES.join(", ")}`);
      } else {
        database2 = config.database;
      }
      return { root, framework, database: database2, warnings };
    } catch (err) {
      if (err instanceof GeneratorError) throw err;
      warnings.push("Unreadable koti.config.json \u2014 falling back to dependency detection");
    }
  }
  let deps = {};
  try {
    const pkg = await import_fs_extra.default.readJson(pkgPath);
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    throw new GeneratorError("NOT_KOTI_PROJECT", `${root} has an unreadable package.json`);
  }
  const database = deps["drizzle-orm"] || deps.pg ? "postgres" : "mongodb";
  if (deps.elysia) {
    warnings.push('No koti.config.json \u2014 framework "elysia" inferred from dependencies');
    return { root, framework: "elysia", database, warnings };
  }
  if (deps.express || deps.mongoose || deps.pg || deps["drizzle-orm"]) {
    warnings.push('No koti.config.json \u2014 framework "express" inferred from dependencies');
    return { root, framework: "express", database, warnings };
  }
  throw new GeneratorError("NOT_KOTI_PROJECT", `${root} is not a Koti project (no koti.config.json and no express/elysia/mongoose/drizzle-orm/pg dependency)`);
};
var readModelManifest = async (root) => {
  try {
    const config = await import_fs_extra.default.readJson(import_path.default.join(root, "koti.config.json"));
    const models = config == null ? void 0 : config.models;
    return models && typeof models === "object" ? models : {};
  } catch {
    return {};
  }
};
var upsertModelManifest = async (root, name, entry) => {
  const configPath = import_path.default.join(root, "koti.config.json");
  let config = {};
  try {
    config = await import_fs_extra.default.readJson(configPath);
  } catch {
    throw new GeneratorError("IO_ERROR", `Could not read ${configPath} to record the models manifest`);
  }
  const models = config.models && typeof config.models === "object" ? config.models : {};
  models[name] = entry;
  config.models = models;
  await import_fs_extra.default.writeFile(configPath, JSON.stringify(config, null, 2));
};
var updateIndexExport = async (dirPath, exportLine) => {
  const indexPath = import_path.default.join(dirPath, "index.ts");
  try {
    let content = "";
    if (await import_fs_extra.default.pathExists(indexPath)) {
      content = await import_fs_extra.default.readFile(indexPath, "utf-8");
    }
    if (content.includes(exportLine)) return;
    const separator = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
    await import_fs_extra.default.writeFile(indexPath, content + separator + exportLine + "\n");
  } catch {
  }
};

// src/generators/enum.ts
var import_fs_extra2 = __toESM(require_lib());
var import_path2 = __toESM(require("path"));
var generateTypeScriptEnum = (enumName, enumType, values) => {
  const capitalizedName = capitalize(enumName);
  const enumValues = values.map(({ key, value }) => {
    if (enumType === "string") {
      return `  ${key} = '${value}'`;
    }
    return `  ${key} = ${value}`;
  }).join(",\n");
  return `export enum ${capitalizedName} {
${enumValues}
}

export default ${capitalizedName};
`;
};
var createEnum = async (opts) => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, "enum name (PascalCase)");
  for (const v of opts.values) {
    assertValidName(v.key, /^[A-Z][A-Z0-9_]*$/, "enum key (UPPER_SNAKE_CASE)");
    if (typeof v.value === "string" && /[\r\n']/.test(v.value)) {
      throw new GeneratorError("INVALID_INPUT", `Enum value for ${v.key} must not contain newlines or quotes`);
    }
  }
  if (opts.values.length === 0) {
    throw new GeneratorError("INVALID_INPUT", "At least one enum value is required");
  }
  const ctx = await resolveProject(opts.projectRoot);
  const capitalizedName = capitalize(opts.name);
  const enumPath = import_path2.default.join(ctx.root, "src", "enums", `${capitalizedName}.ts`);
  if (await import_fs_extra2.default.pathExists(enumPath)) {
    throw new GeneratorError("DUPLICATE", `Enum already exists: ${enumPath}`);
  }
  await import_fs_extra2.default.ensureDir(import_path2.default.dirname(enumPath));
  await import_fs_extra2.default.writeFile(enumPath, generateTypeScriptEnum(opts.name, opts.enumType, opts.values));
  await updateIndexExport(import_path2.default.join(ctx.root, "src", "enums"), `export { ${capitalizedName} } from './${capitalizedName}';`);
  return { files: [enumPath], warnings: ctx.warnings };
};

// src/generators/task.ts
var import_fs_extra3 = __toESM(require_lib());
var import_path3 = __toESM(require("path"));
var addTaskToEnum = async (projectRoot, taskKey, description) => {
  const enumPath = import_path3.default.join(projectRoot, "src", "enums", "Task.ts");
  if (!await import_fs_extra3.default.pathExists(enumPath)) {
    return false;
  }
  let content = await import_fs_extra3.default.readFile(enumPath, "utf-8");
  if (content.includes(`${taskKey} =`) || content.includes(`${taskKey}=`)) {
    return false;
  }
  const enumClosingMatch = content.match(/([ \t]*\w+\s*=\s*'[^']*',?\s*\n)(}\s*\n)/);
  if (!enumClosingMatch) {
    return false;
  }
  const lastEntry = enumClosingMatch[1];
  const closingBrace = enumClosingMatch[2];
  const lastEntryWithComma = lastEntry.trimEnd().endsWith(",") ? lastEntry : lastEntry.replace(/(\S)\s*$/, "$1,\n");
  const newEnumEntry = `
  /** ${description} */
  ${taskKey} = '${taskKey}',
`;
  content = content.replace(
    lastEntry + closingBrace,
    lastEntryWithComma + newEnumEntry + closingBrace
  );
  const descClosingMatch = content.match(/([ \t]*\[Task\.\w+\]:\s*'[^']*',?\s*\n)(};\s*\n?)/);
  if (descClosingMatch) {
    const lastDescEntry = descClosingMatch[1];
    const descClosing = descClosingMatch[2];
    const lastDescWithComma = lastDescEntry.trimEnd().endsWith(",") ? lastDescEntry : lastDescEntry.replace(/(\S)\s*$/, "$1,\n");
    const newDescEntry = `  [Task.${taskKey}]: '${description.replace(/'/g, "\\'")}',
`;
    content = content.replace(
      lastDescEntry + descClosing,
      lastDescWithComma + newDescEntry + descClosing
    );
  }
  await import_fs_extra3.default.writeFile(enumPath, content);
  return true;
};
var createTask = async (opts) => {
  assertValidName(opts.name, /^[A-Z][A-Z0-9_]*$/, "task name (UPPER_SNAKE_CASE)");
  if (!opts.description.trim()) {
    throw new GeneratorError("INVALID_INPUT", "Task description is required");
  }
  if (/[\r\n]/.test(opts.description)) {
    throw new GeneratorError("INVALID_INPUT", "Task description must be a single line");
  }
  const ctx = await resolveProject(opts.projectRoot);
  const enumPath = import_path3.default.join(ctx.root, "src", "enums", "Task.ts");
  if (!await import_fs_extra3.default.pathExists(enumPath)) {
    throw new GeneratorError("IO_ERROR", `src/enums/Task.ts not found \u2014 run this inside a Koti project (koti new creates it)`);
  }
  const content = await import_fs_extra3.default.readFile(enumPath, "utf-8");
  if (content.includes(`${opts.name} =`) || content.includes(`${opts.name}=`)) {
    throw new GeneratorError("DUPLICATE", `Task ${opts.name} already exists in Task.ts`);
  }
  const added = await addTaskToEnum(ctx.root, opts.name, opts.description);
  if (!added) {
    throw new GeneratorError("IO_ERROR", "Could not parse src/enums/Task.ts \u2014 unexpected enum format");
  }
  return { files: [enumPath], warnings: ctx.warnings };
};

// src/generators/controller.ts
var import_fs_extra4 = __toESM(require_lib());
var import_path4 = __toESM(require("path"));
var generateExpressController = (controllerName) => {
  const capitalizedName = capitalize(controllerName);
  const camelCaseName = toCamelCase(controllerName);
  return `import { Request, Response, NextFunction } from 'express';
import { ApiResponse, PaginatedResponse, AuthenticatedRequest } from '../types/api';
import { AppError } from '../utils/AppError';

export class ${capitalizedName}Controller {
  /**
   * Get all ${controllerName}s with pagination
   * @route GET /api/${toKebabCase(controllerName)}
   */
  public async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // TODO: Implement actual data fetching logic
      const data = []; // Replace with actual data fetching
      const total = 0; // Replace with actual count

      const response: PaginatedResponse = {
        success: true,
        message: '${capitalizedName}s retrieved successfully',
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${controllerName}s\`, 500));
    }
  }

  /**
   * Get single ${controllerName} by ID
   * @route GET /api/${toKebabCase(controllerName)}/:id
   */
  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Implement actual data fetching logic
      const data = null; // Replace with actual data fetching

      if (!data) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} retrieved successfully',
        data
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${controllerName}\`, 500));
    }
  }

  /**
   * Create new ${controllerName}
   * @route POST /api/${toKebabCase(controllerName)}
   */
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { body } = req;

      // TODO: Implement validation and creation logic
      const data = body; // Replace with actual creation logic

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} created successfully',
        data
      };

      res.status(201).json(response);
    } catch (error) {
      next(new AppError(\`Error creating ${controllerName}\`, 400));
    }
  }

  /**
   * Update ${controllerName} by ID
   * @route PUT /api/${toKebabCase(controllerName)}/:id
   */
  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { body } = req;

      // TODO: Implement actual update logic
      const data = body; // Replace with actual update logic

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} updated successfully',
        data
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error updating ${controllerName}\`, 400));
    }
  }

  /**
   * Delete ${controllerName} by ID
   * @route DELETE /api/${toKebabCase(controllerName)}/:id
   */
  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Implement actual deletion logic

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error deleting ${controllerName}\`, 400));
    }
  }
}

export default new ${capitalizedName}Controller();
`;
};
var generateElysiaController = (controllerName) => {
  const capitalizedName = capitalize(controllerName);
  const camelCaseName = toCamelCase(controllerName);
  return `import { AppError } from '../utils/AppError';
import { success, paginated } from '../utils/respond';

export const ${camelCaseName}Controller = {
  /** List ${camelCaseName}s with pagination */
  async getAll({ query }: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    // TODO: Implement actual data fetching logic
    const data: any[] = [];
    const total = 0;
    return paginated('${capitalizedName}s retrieved successfully', data, {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  },

  /** Get one ${camelCaseName} by id */
  async getById({ params }: any) {
    // TODO: Implement actual data fetching logic
    const data = null;
    if (!data) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} retrieved successfully', data);
  },

  /** Create a ${camelCaseName} */
  async create({ body, set }: any) {
    // TODO: Implement creation logic
    set.status = 201;
    return success('${capitalizedName} created successfully', body);
  },

  /** Update a ${camelCaseName} */
  async update({ params, body }: any) {
    // TODO: Implement update logic
    return success('${capitalizedName} updated successfully', { id: params.id, ...body });
  },

  /** Delete a ${camelCaseName} */
  async delete({ params }: any) {
    // TODO: Implement delete logic
    return success('${capitalizedName} deleted successfully');
  }
};

export default ${camelCaseName}Controller;
`;
};
var createController = async (opts) => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, "controller name (PascalCase)");
  const ctx = await resolveProject(opts.projectRoot);
  const camelName = toCamelCase(opts.name);
  const filePath = import_path4.default.join(ctx.root, "src", "controllers", `${camelName}Controller.ts`);
  if (await import_fs_extra4.default.pathExists(filePath)) {
    throw new GeneratorError("DUPLICATE", `Controller already exists: ${filePath}`);
  }
  const content = ctx.framework === "elysia" ? generateElysiaController(opts.name) : generateExpressController(opts.name);
  await import_fs_extra4.default.ensureDir(import_path4.default.dirname(filePath));
  await import_fs_extra4.default.writeFile(filePath, content);
  await updateIndexExport(
    import_path4.default.join(ctx.root, "src", "controllers"),
    `export { default as ${camelName}Controller } from './${camelName}Controller';`
  );
  return { files: [filePath], warnings: ctx.warnings };
};

// src/generators/service.ts
var import_fs_extra5 = __toESM(require_lib());
var import_path5 = __toESM(require("path"));
var generateService = (serviceName) => {
  const capitalizedName = capitalize(serviceName);
  return `import { AppError } from '../utils/AppError';

export class ${capitalizedName}Service {
  /**
   * Service method example
   * @param data - Input data
   * @returns Promise<any>
   */
  public async performOperation(data: any): Promise<any> {
    try {
      // TODO: Implement service logic here
      return data;
    } catch (error) {
      throw new AppError(\`${capitalizedName} service error: \${error}\`, 500);
    }
  }

  /**
   * Validation method example
   * @param data - Data to validate
   * @returns boolean
   */
  public validateData(data: any): boolean {
    // TODO: Implement validation logic
    return data !== null && data !== undefined;
  }

  /**
   * Process data method example
   * @param rawData - Raw data to process
   * @returns Processed data
   */
  public processData(rawData: any): any {
    // TODO: Implement data processing logic
    return rawData;
  }
}

export default new ${capitalizedName}Service();
`;
};
var createService = async (opts) => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, "service name (PascalCase)");
  const ctx = await resolveProject(opts.projectRoot);
  const camelName = toCamelCase(opts.name);
  const filePath = import_path5.default.join(ctx.root, "src", "services", `${camelName}Service.ts`);
  if (await import_fs_extra5.default.pathExists(filePath)) {
    throw new GeneratorError("DUPLICATE", `Service already exists: ${filePath}`);
  }
  const content = generateService(opts.name);
  await import_fs_extra5.default.ensureDir(import_path5.default.dirname(filePath));
  await import_fs_extra5.default.writeFile(filePath, content);
  await updateIndexExport(
    import_path5.default.join(ctx.root, "src", "services"),
    `export * from './${camelName}Service';`
  );
  return { files: [filePath], warnings: ctx.warnings };
};

// src/generators/middleware.ts
var import_fs_extra6 = __toESM(require_lib());
var import_path6 = __toESM(require("path"));
var generateExpressMiddleware = (middlewareName) => {
  const camelCaseName = toCamelCase(middlewareName);
  return `import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * ${capitalize(middlewareName)} middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const ${camelCaseName} = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // TODO: Implement middleware logic here
    console.log(\`${capitalize(middlewareName)} middleware executed for \${req.method} \${req.path}\`);

    // Example: Check some condition
    const isValid = true; // Replace with actual validation logic

    if (!isValid) {
      return next(new AppError('${capitalize(middlewareName)} validation failed', 400));
    }

    next();
  } catch (error) {
    next(new AppError(\`${capitalize(middlewareName)} middleware error\`, 500));
  }
};

export default ${camelCaseName};
`;
};
var generateElysiaMiddleware = (middlewareName) => {
  const camelCaseName = toCamelCase(middlewareName);
  return `import { Elysia } from 'elysia';

/**
 * ${capitalize(middlewareName)} middleware plugin
 * Attach with .use(${camelCaseName}) on an Elysia instance or route group.
 */
export const ${camelCaseName} = new Elysia({ name: '${camelCaseName}' })
  .onBeforeHandle(({ request, set }) => {
    // TODO: Implement middleware logic here
    console.log(\`${capitalize(middlewareName)} middleware executed for \${request.method} \${new URL(request.url).pathname}\`);

    // Example: block the request by returning a response
    // set.status = 400;
    // return { success: false, message: '${capitalize(middlewareName)} validation failed' };
  });

export default ${camelCaseName};
`;
};
var createMiddleware = async (opts) => {
  assertValidName(opts.name, /^[A-Za-z][a-zA-Z0-9]*$/, "middleware name");
  const ctx = await resolveProject(opts.projectRoot);
  const camelName = toCamelCase(opts.name);
  const filePath = import_path6.default.join(ctx.root, "src", "middleware", `${camelName}.ts`);
  if (await import_fs_extra6.default.pathExists(filePath)) {
    throw new GeneratorError("DUPLICATE", `Middleware already exists: ${filePath}`);
  }
  const content = ctx.framework === "elysia" ? generateElysiaMiddleware(opts.name) : generateExpressMiddleware(opts.name);
  await import_fs_extra6.default.ensureDir(import_path6.default.dirname(filePath));
  await import_fs_extra6.default.writeFile(filePath, content);
  await updateIndexExport(
    import_path6.default.join(ctx.root, "src", "middleware"),
    `export { ${camelName} } from './${camelName}';`
  );
  return { files: [filePath], warnings: ctx.warnings };
};

// src/generators/model.ts
var import_fs_extra7 = __toESM(require_lib());
var import_path7 = __toESM(require("path"));

// src/generators/crud/mongoose/modelFile.ts
var generateTypeScriptModel = (modelName, fields) => {
  const capitalizedName = capitalize(modelName);
  const fieldsCode = fields.map((field) => {
    const options = [];
    if (field.required) options.push("required: true");
    if (field.unique) options.push("unique: true");
    if (field.index) options.push("index: true");
    if (field.default) options.push(`default: ${field.type === "String" ? `'${field.default}'` : field.default}`);
    const optionsString = options.length > 0 ? `,  ${options.join(", ")}` : "";
    if (field.type === "Array") {
      return `  ${field.name}: [{ type: Schema.Types.Mixed${optionsString} }]`;
    }
    const mongooseType = field.type === "Mixed" || field.type === "JSON" ? "Schema.Types.Mixed" : field.type === "ObjectId" ? "Schema.Types.ObjectId" : field.type;
    return `  ${field.name}: { type: ${mongooseType}${optionsString} }`;
  }).join(",\n");
  return `import { Schema, model, Document, Types } from 'mongoose';

export interface I${capitalizedName} extends Document {
${fields.map((field) => {
    const tsType = field.type === "ObjectId" ? "Types.ObjectId" : field.type === "String" ? "string" : field.type === "Number" ? "number" : field.type === "Boolean" ? "boolean" : field.type === "Date" ? "Date" : field.type === "Array" ? "any[]" : "any";
    return `  ${field.name}: ${tsType};`;
  }).join("\n")}
}

const ${capitalizedName}Schema = new Schema<I${capitalizedName}>({
${fieldsCode}
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export const ${capitalizedName} = model<I${capitalizedName}>('${capitalizedName}', ${capitalizedName}Schema);
export default ${capitalizedName};
`;
};

// src/generators/crud/mongoose/service.ts
var generateCRUDService = (modelName, fields) => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  return `import { AppError } from '../utils/AppError';
import ${capitalizedName} from '../models/${capitalizedName}';
import { PaginationResult, QueryOptions } from '../types/api';

export class ${capitalizedName}Service {
  /**
   * Get all ${capitalizedName}s with pagination and search
   */
  public async getAll(options: QueryOptions): Promise<{ data: any[]; pagination: PaginationResult }> {
    try {
      const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      // Build search query
      let query: any = {};
      if (search) {
        const searchFields = [${fields.filter((f) => f.type === "String").map((f) => `'${f.name}'`).join(", ")}];
        if (searchFields.length > 0) {
          query.$or = searchFields.map(field => ({
            [field]: { $regex: search, $options: 'i' }
          }));
        }
      }

      // Execute queries
      const [data, total] = await Promise.all([
        ${capitalizedName}.find(query)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ${capitalizedName}.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new AppError(\`Error fetching ${capitalizedName}s: \${error}\`, 500);
    }
  }

  /**
   * Get ${capitalizedName} by ID
   */
  public async getById(id: string): Promise<any> {
    try {
      const ${camelCaseName} = await ${capitalizedName}.findById(id).lean();
      return ${camelCaseName};
    } catch (error) {
      throw new AppError(\`Error fetching ${capitalizedName}: \${error}\`, 500);
    }
  }

  /**
   * Create new ${capitalizedName}
   */
  public async create(data: any): Promise<any> {
    try {
      const ${camelCaseName} = new ${capitalizedName}(data);
      await ${camelCaseName}.save();
      return ${camelCaseName}.toObject();
    } catch (error) {
      throw new AppError(\`Error creating ${capitalizedName}: \${error}\`, 400);
    }
  }

  /**
   * Update ${capitalizedName} by ID
   */
  public async update(id: string, data: any): Promise<any> {
    try {
      const ${camelCaseName} = await ${capitalizedName}.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();
      return ${camelCaseName};
    } catch (error) {
      throw new AppError(\`Error updating ${capitalizedName}: \${error}\`, 400);
    }
  }

  /**
   * Delete ${capitalizedName} by ID
   */
  public async delete(id: string): Promise<boolean> {
    try {
      const result = await ${capitalizedName}.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw new AppError(\`Error deleting ${capitalizedName}: \${error}\`, 500);
    }
  }
}

export default new ${capitalizedName}Service();`;
};

// src/generators/crud/express.ts
var generateCRUDController = (modelName, fields) => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  return `import { Request, Response, NextFunction } from 'express';
import { ApiResponse, PaginatedResponse, AuthenticatedRequest } from '../types/api';
import { AppError } from '../utils/AppError';
import ${capitalizedName}Service from '../services/${camelCaseName}Service';

export class ${capitalizedName}Controller {
  /**
   * Get all ${capitalizedName}s with pagination
   * @route GET /api/${camelCaseName}
   */
  public async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || parseInt(process.env.DEFAULT_PAGE_LIMIT || '10');
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

      const result = await ${capitalizedName}Service.getAll({
        page,
        limit,
        search,
        sortBy,
        sortOrder
      });

      const response: PaginatedResponse = {
        success: true,
        message: '${capitalizedName}s retrieved successfully',
        data: result.data,
        pagination: result.pagination
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${capitalizedName}s\`, 500));
    }
  }

  /**
   * Get single ${capitalizedName} by ID
   * @route GET /api/${camelCaseName}/:id
   */
  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ${camelCaseName} = await ${capitalizedName}Service.getById(id);

      if (!${camelCaseName}) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} retrieved successfully',
        data: ${camelCaseName}
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${capitalizedName}\`, 500));
    }
  }

  /**
   * Create new ${capitalizedName}
   * @route POST /api/${camelCaseName}
   */
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ${camelCaseName} = await ${capitalizedName}Service.create(req.body);

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} created successfully',
        data: ${camelCaseName}
      };

      res.status(201).json(response);
    } catch (error) {
      next(new AppError(\`Error creating ${capitalizedName}\`, 400));
    }
  }

  /**
   * Update ${capitalizedName} by ID
   * @route PUT /api/${camelCaseName}/:id
   */
  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ${camelCaseName} = await ${capitalizedName}Service.update(id, req.body);

      if (!${camelCaseName}) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} updated successfully',
        data: ${camelCaseName}
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error updating ${capitalizedName}\`, 400));
    }
  }

  /**
   * Delete ${capitalizedName} by ID
   * @route DELETE /api/${camelCaseName}/:id
   */
  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await ${capitalizedName}Service.delete(id);

      if (!deleted) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} deleted successfully',
        data: null
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error deleting ${capitalizedName}\`, 500));
    }
  }
}

export default new ${capitalizedName}Controller();`;
};
var generateJoiValidation = (modelName, fields) => {
  const capitalizedName = capitalize(modelName);
  const joiFields = fields.map((field) => {
    let joiType = "Joi.string()";
    switch (field.type) {
      case "String":
        joiType = "Joi.string()";
        break;
      case "Number":
        joiType = "Joi.number()";
        break;
      case "Boolean":
        joiType = "Joi.boolean()";
        break;
      case "Date":
        joiType = "Joi.date()";
        break;
      case "Array":
        joiType = "Joi.array()";
        break;
      case "ObjectId":
        joiType = "Joi.string()";
        break;
      default:
        joiType = "Joi.any()";
        break;
    }
    const chain = [joiType];
    if (field.required) chain.push(".required()");
    else chain.push(".optional()");
    return `  ${field.name}: ${chain.join("")}`;
  }).join(",\n");
  return `import Joi from 'joi';

export const create${capitalizedName}Schema = Joi.object({
${joiFields}
});

export const update${capitalizedName}Schema = Joi.object({
${fields.map((field) => {
    let joiType = "Joi.string()";
    switch (field.type) {
      case "String":
        joiType = "Joi.string()";
        break;
      case "Number":
        joiType = "Joi.number()";
        break;
      case "Boolean":
        joiType = "Joi.boolean()";
        break;
      case "Date":
        joiType = "Joi.date()";
        break;
      case "Array":
        joiType = "Joi.array()";
        break;
      case "ObjectId":
        joiType = "Joi.string()";
        break;
      default:
        joiType = "Joi.any()";
        break;
    }
    return `  ${field.name}: ${joiType}.optional()`;
  }).join(",\n")}
}).min(1);
`;
};
var generateCRUDRoutes = (modelName, fields = [], withTasks = false) => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  const upperSnakeName = toUpperSnakeCase(modelName);
  const hasValidation = fields.length > 0;
  const validationImport = hasValidation ? `
import { validate } from '../middleware/validation';
import { create${capitalizedName}Schema, update${capitalizedName}Schema } from '../validators/${camelCaseName}';` : "";
  const permissionImport = withTasks ? `
import { checkPermission } from '../middleware/checkPermission';
import { Task } from '../enums/Task';` : "";
  const viewPerm = withTasks ? `checkPermission(Task.VIEW_${upperSnakeName}), ` : "";
  const createPerm = withTasks ? `checkPermission(Task.CREATE_${upperSnakeName}), ` : "";
  const updatePerm = withTasks ? `checkPermission(Task.UPDATE_${upperSnakeName}), ` : "";
  const deletePerm = withTasks ? `checkPermission(Task.DELETE_${upperSnakeName}), ` : "";
  return `import { Router } from 'express';
import ${camelCaseName}Controller from '../controllers/${camelCaseName}Controller';
import { auth } from '../middleware/auth';${validationImport}${permissionImport}

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ${capitalizedName}:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the ${camelCaseName}
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/${camelCaseName}:
 *   get:
 *     summary: Get all ${camelCaseName}s with pagination
 *     tags: [${capitalizedName}]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of ${camelCaseName}s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', auth, ${viewPerm}${camelCaseName}Controller.getAll);

/**
 * @swagger
 * /api/${camelCaseName}/{id}:
 *   get:
 *     summary: Get ${camelCaseName} by ID
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${capitalizedName} ID
 *     responses:
 *       200:
 *         description: ${capitalizedName} details
 *       404:
 *         description: ${capitalizedName} not found
 */
router.get('/:id', auth, ${viewPerm}${camelCaseName}Controller.getById);

/**
 * @swagger
 * /api/${camelCaseName}:
 *   post:
 *     summary: Create new ${camelCaseName}
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${capitalizedName}'
 *     responses:
 *       201:
 *         description: ${capitalizedName} created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, ${createPerm}${hasValidation ? `validate(create${capitalizedName}Schema), ` : ""}${camelCaseName}Controller.create);

/**
 * @swagger
 * /api/${camelCaseName}/{id}:
 *   put:
 *     summary: Update ${camelCaseName} by ID
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${capitalizedName} ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${capitalizedName}'
 *     responses:
 *       200:
 *         description: ${capitalizedName} updated successfully
 *       404:
 *         description: ${capitalizedName} not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', auth, ${updatePerm}${hasValidation ? `validate(update${capitalizedName}Schema), ` : ""}${camelCaseName}Controller.update);

/**
 * @swagger
 * /api/${camelCaseName}/{id}:
 *   delete:
 *     summary: Delete ${camelCaseName} by ID
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${capitalizedName} ID
 *     responses:
 *       200:
 *         description: ${capitalizedName} deleted successfully
 *       404:
 *         description: ${capitalizedName} not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', auth, ${deletePerm}${camelCaseName}Controller.delete);

export default router;`;
};

// src/generators/crud/elysia.ts
var generateElysiaCrudController = (modelName, fields) => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  return `import ${capitalizedName}Service from '../services/${camelCaseName}Service';
import { AppError } from '../utils/AppError';
import { success, paginated } from '../utils/respond';

export const ${camelCaseName}Controller = {
  /** List ${camelCaseName}s with pagination, search and sorting */
  async getAll({ query }: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || parseInt(process.env.DEFAULT_PAGE_LIMIT || '10');
    const search = query.search as string | undefined;
    const sortBy = (query.sortBy as string) || 'createdAt';
    const sortOrder = ((query.sortOrder as string) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
    const result = await ${capitalizedName}Service.getAll({ page, limit, search, sortBy, sortOrder });
    return paginated('${capitalizedName}s retrieved successfully', result.data, result.pagination);
  },

  /** Get one ${camelCaseName} by id */
  async getById({ params }: any) {
    const item = await ${capitalizedName}Service.getById(params.id);
    if (!item) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} retrieved successfully', item);
  },

  /** Create a ${camelCaseName} */
  async create({ body, set }: any) {
    const item = await ${capitalizedName}Service.create(body);
    set.status = 201;
    return success('${capitalizedName} created successfully', item);
  },

  /** Update a ${camelCaseName} */
  async update({ params, body }: any) {
    const item = await ${capitalizedName}Service.update(params.id, body);
    if (!item) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} updated successfully', item);
  },

  /** Delete a ${camelCaseName} */
  async delete({ params }: any) {
    const deleted = await ${capitalizedName}Service.delete(params.id);
    if (!deleted) throw new AppError('${capitalizedName} not found', 404);
    return success('${capitalizedName} deleted successfully');
  }
};

export default ${camelCaseName}Controller;
`;
};
var typeBoxFor = (field) => {
  switch (field.type) {
    case "String":
      return "t.String()";
    case "Number":
      return "t.Number()";
    case "Boolean":
      return "t.Boolean()";
    case "Date":
      return `t.String({ format: 'date-time' })`;
    case "ObjectId":
      return "t.String()";
    case "Array":
      return "t.Array(t.Any())";
    default:
      return "t.Any()";
  }
};
var generateTypeBoxValidator = (modelName, fields) => {
  const capitalizedName = capitalize(modelName);
  const props = fields.map((field) => {
    const base = typeBoxFor(field);
    const value = field.required ? base : `t.Optional(${base})`;
    return `  ${field.name}: ${value}`;
  }).join(",\n");
  return `import { t } from 'elysia';

export const create${capitalizedName}Body = t.Object({
${props}
});

export const update${capitalizedName}Body = t.Partial(create${capitalizedName}Body);
`;
};
var generateElysiaCrudRoutes = (modelName, fields, withTasks = false) => {
  const capitalizedName = capitalize(modelName);
  const camelCaseName = toCamelCase(modelName);
  const upperSnakeName = toUpperSnakeCase(modelName);
  const taskImport = withTasks ? `
import { Task } from '../enums/Task';` : "";
  const authFor = (op) => withTasks ? `[Task.${op}_${upperSnakeName}]` : "true";
  return `import { Elysia, t } from 'elysia';
import { ${camelCaseName}Controller } from '../controllers/${camelCaseName}Controller';
import { authPlugin } from '../middleware/auth';${taskImport}
import { create${capitalizedName}Body, update${capitalizedName}Body } from '../validators/${camelCaseName}';

const tag = ['${capitalizedName}s'];
const secured = { security: [{ bearerAuth: [] }] };
const idParam = t.Object({ id: t.String() });

export const ${camelCaseName}Routes = new Elysia({ prefix: '/${camelCaseName}' })
  .use(authPlugin)
  .get('/', ${camelCaseName}Controller.getAll, {
    auth: ${authFor("VIEW")},
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      sortBy: t.Optional(t.String()),
      sortOrder: t.Optional(t.String())
    }),
    detail: { tags: tag, summary: 'List ${capitalizedName}s', ...secured }
  })
  .get('/:id', ${camelCaseName}Controller.getById, {
    auth: ${authFor("VIEW")},
    params: idParam,
    detail: { tags: tag, summary: 'Get ${capitalizedName} by ID', ...secured }
  })
  .post('/', ${camelCaseName}Controller.create, {
    auth: ${authFor("CREATE")},
    body: create${capitalizedName}Body,
    detail: { tags: tag, summary: 'Create a ${capitalizedName}', ...secured }
  })
  .put('/:id', ${camelCaseName}Controller.update, {
    auth: ${authFor("UPDATE")},
    params: idParam,
    body: update${capitalizedName}Body,
    detail: { tags: tag, summary: 'Update a ${capitalizedName}', ...secured }
  })
  .delete('/:id', ${camelCaseName}Controller.delete, {
    auth: ${authFor("DELETE")},
    params: idParam,
    detail: { tags: tag, summary: 'Delete a ${capitalizedName}', ...secured }
  });

export default ${camelCaseName}Routes;
`;
};

// src/generators/model.ts
var validateFields = (fields) => {
  if (fields.length === 0) throw new GeneratorError("INVALID_INPUT", "At least one field is required");
  for (const f of fields) {
    assertValidName(f.name, /^[a-zA-Z_][a-zA-Z0-9_]*$/, "field name");
    if (!FIELD_TYPES.includes(f.type)) {
      throw new GeneratorError("INVALID_INPUT", `Unknown field type "${f.type}" (valid: ${FIELD_TYPES.join(", ")})`);
    }
    if (f.default !== void 0 && /[\r\n]/.test(f.default)) {
      throw new GeneratorError("INVALID_INPUT", `Default value for ${f.name} must be a single line`);
    }
  }
};
var registerRouteInIndex = async (projectRoot, framework, camelName) => {
  const indexPath = import_path7.default.join(projectRoot, "src", "routes", "index.ts");
  let content;
  try {
    content = await import_fs_extra7.default.readFile(indexPath, "utf-8");
  } catch {
    return false;
  }
  if (framework === "express") {
    const importStatement2 = `import ${camelName}Routes from './${camelName}';`;
    const routeUsage = `router.use('/${camelName}', ${camelName}Routes);`;
    if (content.includes(importStatement2)) return true;
    const lines2 = content.split("\n");
    let lastImportIndex2 = -1;
    let routerUseIndex = -1;
    for (let i = 0; i < lines2.length; i++) {
      if (lines2[i].startsWith("import") && lines2[i].includes("from")) lastImportIndex2 = i;
      if (lines2[i].includes("router.use") && lines2[i].includes("Routes")) routerUseIndex = i;
    }
    if (lastImportIndex2 < 0 || routerUseIndex < 0) return false;
    lines2.splice(lastImportIndex2 + 1, 0, importStatement2);
    lines2.splice(routerUseIndex + 2, 0, routeUsage);
    await import_fs_extra7.default.writeFile(indexPath, lines2.join("\n"));
    return true;
  }
  const importStatement = `import { ${camelName}Routes } from './${camelName}';`;
  if (content.includes(importStatement)) return true;
  const lines = content.split("\n");
  let lastImportIndex = -1;
  let lastUseIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import") && lines[i].includes("from")) lastImportIndex = i;
    if (/^\s*\.use\(\w+Routes\);?\s*$/.test(lines[i])) lastUseIndex = i;
  }
  if (lastImportIndex < 0 || lastUseIndex < 0) return false;
  lines.splice(lastImportIndex + 1, 0, importStatement);
  lastUseIndex += 1;
  if (lines[lastUseIndex].trimEnd().endsWith(";")) {
    lines[lastUseIndex] = lines[lastUseIndex].replace(/;\s*$/, "");
    lines.splice(lastUseIndex + 1, 0, `  .use(${camelName}Routes);`);
  } else {
    lines.splice(lastUseIndex + 1, 0, `  .use(${camelName}Routes)`);
  }
  await import_fs_extra7.default.writeFile(indexPath, lines.join("\n"));
  return true;
};
var createModel = async (opts) => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, "model name (PascalCase)");
  validateFields(opts.fields);
  const ctx = await resolveProject(opts.projectRoot);
  const capitalizedName = capitalize(opts.name);
  const camelName = toCamelCase(opts.name);
  const upperSnakeName = toUpperSnakeCase(opts.name);
  const files = [];
  const warnings = [...ctx.warnings];
  const modelPath = import_path7.default.join(ctx.root, "src", "models", `${capitalizedName}.ts`);
  if (await import_fs_extra7.default.pathExists(modelPath)) {
    throw new GeneratorError("DUPLICATE", `Model already exists: ${modelPath}`);
  }
  await import_fs_extra7.default.ensureDir(import_path7.default.dirname(modelPath));
  await import_fs_extra7.default.writeFile(modelPath, generateTypeScriptModel(opts.name, opts.fields));
  files.push(modelPath);
  await updateIndexExport(
    import_path7.default.join(ctx.root, "src", "models"),
    `export { default as ${capitalizedName}, I${capitalizedName} } from './${capitalizedName}';`
  );
  if (!opts.crud) {
    await upsertModelManifest(ctx.root, capitalizedName, { fields: opts.fields, crud: false, rbacTasks: false });
    return { files, warnings };
  }
  let withTasks = !!opts.tasks;
  if (withTasks) {
    const taskEntries = [
      { key: `VIEW_${upperSnakeName}`, desc: `View the list of ${camelName}s and ${camelName} details` },
      { key: `CREATE_${upperSnakeName}`, desc: `Create new ${camelName} records` },
      { key: `UPDATE_${upperSnakeName}`, desc: `Update existing ${camelName} records` },
      { key: `DELETE_${upperSnakeName}`, desc: `Delete ${camelName} records` }
    ];
    let added = 0;
    for (const entry of taskEntries) {
      if (await addTaskToEnum(ctx.root, entry.key, entry.desc)) added++;
    }
    if (added > 0) {
      files.push(import_path7.default.join(ctx.root, "src", "enums", "Task.ts"));
    } else {
      withTasks = false;
      warnings.push("No RBAC tasks were added (Task.ts missing or entries already exist) \u2014 routes generated without permission middleware");
    }
  }
  const isElysia = ctx.framework === "elysia";
  const writes = [
    {
      file: import_path7.default.join(ctx.root, "src", "controllers", `${camelName}Controller.ts`),
      content: isElysia ? generateElysiaCrudController(opts.name, opts.fields) : generateCRUDController(opts.name, opts.fields),
      barrelDir: import_path7.default.join(ctx.root, "src", "controllers"),
      barrelLine: `export { default as ${camelName}Controller } from './${camelName}Controller';`
    },
    {
      file: import_path7.default.join(ctx.root, "src", "services", `${camelName}Service.ts`),
      content: generateCRUDService(opts.name, opts.fields),
      barrelDir: import_path7.default.join(ctx.root, "src", "services"),
      barrelLine: `export * from './${camelName}Service';`
    },
    {
      file: import_path7.default.join(ctx.root, "src", "validators", `${camelName}.ts`),
      content: isElysia ? generateTypeBoxValidator(opts.name, opts.fields) : generateJoiValidation(opts.name, opts.fields)
    },
    {
      file: import_path7.default.join(ctx.root, "src", "routes", `${camelName}.ts`),
      content: isElysia ? generateElysiaCrudRoutes(opts.name, opts.fields, withTasks) : generateCRUDRoutes(opts.name, opts.fields, withTasks)
    }
  ];
  for (const w of writes) {
    await import_fs_extra7.default.ensureDir(import_path7.default.dirname(w.file));
    await import_fs_extra7.default.writeFile(w.file, w.content);
    files.push(w.file);
    if (w.barrelDir && w.barrelLine) await updateIndexExport(w.barrelDir, w.barrelLine);
  }
  const registered = await registerRouteInIndex(ctx.root, ctx.framework, camelName);
  if (!registered) {
    warnings.push(
      ctx.framework === "express" ? `Could not update src/routes/index.ts \u2014 add manually: router.use('/${camelName}', ${camelName}Routes);` : `Could not update src/routes/index.ts \u2014 add manually: .use(${camelName}Routes)`
    );
  }
  await upsertModelManifest(ctx.root, capitalizedName, { fields: opts.fields, crud: true, rbacTasks: withTasks });
  return { files, warnings };
};
var sniffModelFlags = async (projectRoot, camelName) => {
  const routePath = import_path7.default.join(projectRoot, "src", "routes", `${camelName}.ts`);
  if (!await import_fs_extra7.default.pathExists(routePath)) return { crud: false, rbacTasks: false };
  const routes = await import_fs_extra7.default.readFile(routePath, "utf-8");
  return { crud: true, rbacTasks: routes.includes("checkPermission(") || routes.includes("auth: [Task.") };
};
var parseExistingModel = async (projectRoot, name) => {
  const modelPath = import_path7.default.join(projectRoot, "src", "models", `${capitalize(name)}.ts`);
  if (!await import_fs_extra7.default.pathExists(modelPath)) {
    throw new GeneratorError("IO_ERROR", `Model not found: ${modelPath}`);
  }
  const content = await import_fs_extra7.default.readFile(modelPath, "utf-8");
  const fields = [];
  const schemaMatch = content.match(/const\s+\w+Schema\s*=\s*new\s+Schema<.*?>\(\{([\s\S]*?)\},\s*\{/);
  if (!schemaMatch) {
    throw new GeneratorError("IO_ERROR", `Could not parse schema in ${modelPath}`);
  }
  const schemaContent = schemaMatch[1];
  const fieldMatches = schemaContent.match(/(\w+):\s*(\[)?\{[^}]+\}(\])?/g);
  if (fieldMatches) {
    fieldMatches.forEach((fieldMatch) => {
      const nameMatch = fieldMatch.match(/(\w+):/);
      const isArrayForm = /^\w+:\s*\[/.test(fieldMatch);
      const typeMatch = fieldMatch.match(/type:\s*(\w+)/);
      const requiredMatch = fieldMatch.match(/required:\s*(true|false)/);
      const uniqueMatch = fieldMatch.match(/unique:\s*(true|false)/);
      const indexMatch = fieldMatch.match(/index:\s*(true|false)/);
      const defaultMatch = fieldMatch.match(/default:\s*(['"].*?['"]|\d+|true|false)/);
      if (nameMatch && (isArrayForm || typeMatch)) {
        fields.push({
          name: nameMatch[1],
          type: isArrayForm ? "Array" : typeMatch[1],
          required: requiredMatch ? requiredMatch[1] === "true" : false,
          unique: uniqueMatch ? uniqueMatch[1] === "true" : false,
          index: indexMatch ? indexMatch[1] === "true" : false,
          default: defaultMatch ? defaultMatch[1].replace(/['"]/g, "") : void 0
        });
      }
    });
  }
  return fields;
};
var editModel = async (opts) => {
  var _a;
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, "model name (PascalCase)");
  const ctx = await resolveProject(opts.projectRoot);
  const capitalizedName = capitalize(opts.name);
  const camelName = toCamelCase(opts.name);
  const files = [];
  const warnings = [...ctx.warnings];
  const manifest = await readModelManifest(ctx.root);
  let entry = manifest[capitalizedName];
  if (!entry) {
    const parsed = await parseExistingModel(ctx.root, opts.name);
    entry = { fields: parsed, ...await sniffModelFlags(ctx.root, camelName) };
    await upsertModelManifest(ctx.root, capitalizedName, entry);
  }
  let updatedFields = entry.fields;
  for (const removeName of opts.removeFields ?? []) {
    if (!updatedFields.some((f) => f.name === removeName)) {
      throw new GeneratorError("INVALID_INPUT", `Field "${removeName}" does not exist on ${capitalizedName}`);
    }
    updatedFields = updatedFields.filter((f) => f.name !== removeName);
  }
  if ((_a = opts.addFields) == null ? void 0 : _a.length) {
    validateFields(opts.addFields);
    for (const f of opts.addFields) {
      if (updatedFields.some((existing) => existing.name === f.name)) {
        throw new GeneratorError("INVALID_INPUT", `Field "${f.name}" already exists on ${capitalizedName}`);
      }
    }
    updatedFields = [...updatedFields, ...opts.addFields];
  }
  if (updatedFields.length === 0) {
    throw new GeneratorError("INVALID_INPUT", "Cannot remove all fields from a model");
  }
  const modelPath = import_path7.default.join(ctx.root, "src", "models", `${capitalizedName}.ts`);
  if (await import_fs_extra7.default.pathExists(modelPath)) {
    const previousModel = await import_fs_extra7.default.readFile(modelPath, "utf-8");
    await import_fs_extra7.default.writeFile(modelPath + ".bak", previousModel);
  }
  await import_fs_extra7.default.writeFile(modelPath, generateTypeScriptModel(opts.name, updatedFields));
  files.push(modelPath);
  if (opts.updateCrud) {
    const isElysia = ctx.framework === "elysia";
    const routePath = import_path7.default.join(ctx.root, "src", "routes", `${camelName}.ts`);
    let withTasks = false;
    if (await import_fs_extra7.default.pathExists(routePath)) {
      const existingRoutes = await import_fs_extra7.default.readFile(routePath, "utf-8");
      withTasks = existingRoutes.includes("checkPermission(") || existingRoutes.includes("auth: [Task.");
    }
    const regens = [
      {
        file: import_path7.default.join(ctx.root, "src", "controllers", `${camelName}Controller.ts`),
        content: isElysia ? generateElysiaCrudController(opts.name, updatedFields) : generateCRUDController(opts.name, updatedFields)
      },
      {
        file: import_path7.default.join(ctx.root, "src", "services", `${camelName}Service.ts`),
        content: generateCRUDService(opts.name, updatedFields)
      },
      {
        file: import_path7.default.join(ctx.root, "src", "validators", `${camelName}.ts`),
        content: isElysia ? generateTypeBoxValidator(opts.name, updatedFields) : generateJoiValidation(opts.name, updatedFields)
      },
      {
        file: routePath,
        content: isElysia ? generateElysiaCrudRoutes(opts.name, updatedFields, withTasks) : generateCRUDRoutes(opts.name, updatedFields, withTasks)
      }
    ];
    for (const r of regens) {
      if (!await import_fs_extra7.default.pathExists(r.file)) {
        warnings.push(`${import_path7.default.relative(ctx.root, r.file)} did not exist \u2014 skipped`);
        continue;
      }
      const previous = await import_fs_extra7.default.readFile(r.file, "utf-8");
      await import_fs_extra7.default.writeFile(r.file + ".bak", previous);
      await import_fs_extra7.default.writeFile(r.file, r.content);
      files.push(r.file);
    }
  }
  await upsertModelManifest(ctx.root, capitalizedName, { ...entry, fields: updatedFields });
  return { files, warnings };
};

// src/generators/project.ts
var import_fs_extra8 = __toESM(require_lib());
var import_path8 = __toESM(require("path"));
var import_child_process = require("child_process");
var noop = (_msg) => {
};
var runInstall = (cwd, cmd, timeoutMs, log) => new Promise((resolve) => {
  log == null ? void 0 : log(`Running: ${cmd} install`);
  const child = (0, import_child_process.spawn)(cmd, ["install"], { cwd, stdio: "ignore", shell: process.platform === "win32" });
  const timer = setTimeout(() => {
    child.kill("SIGKILL");
    resolve(false);
  }, timeoutMs);
  child.on("error", () => {
    clearTimeout(timer);
    resolve(false);
  });
  child.on("close", (code) => {
    clearTimeout(timer);
    resolve(code === 0);
  });
});
var replaceInDir = async (dirPath, projectName) => {
  const entries = await import_fs_extra8.default.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = import_path8.default.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await replaceInDir(fullPath, projectName);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".json")) {
      let content = await import_fs_extra8.default.readFile(fullPath, "utf-8");
      if (content.includes("{{PROJECT_NAME}}")) {
        content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
        await import_fs_extra8.default.writeFile(fullPath, content);
      }
    }
  }
};
var indexRouteContent = (projectName) => `import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types/api';

const router = Router();

/**
 * @swagger
 * /api/:
 *   get:
 *     summary: API welcome message
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Welcome to ${projectName} API',
    data: {
      version: '${getVersion()}',
      description: 'TypeScript API built with Bun, Express, and MongoDB',
      documentation: '/api-docs'
    }
  };
  res.json(response);
});

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: API status information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API status
 */
router.get('/status', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    }
  };
  res.json(response);
});

export default router;`;
var authRouteContent = `import { Router } from 'express';
import authController from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset instructions sent
 *       404:
 *         description: User not found
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid token or password
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', auth, authController.getProfile);

export default router;`;
var createProject = async (opts) => {
  const log = opts.log ?? noop;
  const files = [];
  const warnings = [];
  assertValidName(opts.name, /^[a-z0-9-]+$/, "project name");
  const framework = opts.framework ?? "express";
  if (!FRAMEWORKS.includes(framework)) {
    throw new GeneratorError("UNSUPPORTED_FRAMEWORK", `Unsupported framework: "${framework}" (must be one of ${FRAMEWORKS.join(", ")})`);
  }
  const directory = opts.directory ?? process.cwd();
  const dirStat = await import_fs_extra8.default.stat(directory).catch(() => null);
  if (!dirStat || !dirStat.isDirectory()) {
    throw new GeneratorError("INVALID_INPUT", `Directory does not exist or is not a directory: "${directory}"`);
  }
  const projectPath = import_path8.default.join(directory, opts.name);
  if (await import_fs_extra8.default.pathExists(projectPath)) {
    const targetStat = await import_fs_extra8.default.stat(projectPath);
    const isNonEmptyDir = targetStat.isDirectory() && (await import_fs_extra8.default.readdir(projectPath)).length > 0;
    if (!targetStat.isDirectory() || isNonEmptyDir) {
      throw new GeneratorError("DUPLICATE", `Target already exists: "${projectPath}"`);
    }
  }
  const database = "mongodb";
  log(`\u{1F680} Creating TypeScript Bun API project: ${opts.name}`);
  log(`\u{1F4C1} Project directory: ${projectPath}`);
  await import_fs_extra8.default.ensureDir(projectPath);
  log(`\u{1F9E9} Framework: ${framework}`);
  const templatePath = import_path8.default.join(templatesDir(), framework);
  const sharedTemplatePath = import_path8.default.join(templatesDir(), "shared");
  const srcPath = import_path8.default.join(projectPath, "src");
  const directories = [
    "config",
    "controllers",
    "middleware",
    "models",
    "routes",
    "types",
    "utils",
    "services",
    "schemas",
    "enums",
    "validators",
    "seeds"
  ];
  for (const dir of directories) {
    await import_fs_extra8.default.ensureDir(import_path8.default.join(srcPath, dir));
    log(`\u2705 Created directory: src/${dir}/`);
  }
  const packageJsonPath = import_path8.default.join(templatePath, "package.json");
  const readmePath = import_path8.default.join(templatePath, "README.md");
  if (await import_fs_extra8.default.pathExists(packageJsonPath)) {
    let content = await import_fs_extra8.default.readFile(packageJsonPath, "utf-8");
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, opts.name);
    const dest = import_path8.default.join(projectPath, "package.json");
    await import_fs_extra8.default.writeFile(dest, content);
    files.push(dest);
    log("\u2705 Created file: package.json");
  }
  if (await import_fs_extra8.default.pathExists(readmePath)) {
    let content = await import_fs_extra8.default.readFile(readmePath, "utf-8");
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, opts.name);
    const dest = import_path8.default.join(projectPath, "README.md");
    await import_fs_extra8.default.writeFile(dest, content);
    files.push(dest);
    log("\u2705 Created file: README.md");
  }
  const templateSrcPath = import_path8.default.join(templatePath, "src");
  const projectSrcPath = srcPath;
  if (await import_fs_extra8.default.pathExists(templateSrcPath)) {
    await import_fs_extra8.default.copy(templateSrcPath, projectSrcPath);
    log("\u2705 Copied framework source files");
  }
  const sharedSrcPath = import_path8.default.join(sharedTemplatePath, "src");
  if (await import_fs_extra8.default.pathExists(sharedSrcPath)) {
    await import_fs_extra8.default.copy(sharedSrcPath, projectSrcPath);
    log("\u2705 Copied shared source files");
  }
  const dbTemplateSrc = import_path8.default.join(templatesDir(), "db", database, "src");
  if (await import_fs_extra8.default.pathExists(dbTemplateSrc)) {
    await import_fs_extra8.default.copy(dbTemplateSrc, projectSrcPath);
    log(`\u2705 Copied ${database} source files`);
  }
  if (await import_fs_extra8.default.pathExists(projectSrcPath)) {
    await replaceInDir(projectSrcPath, opts.name);
  }
  const additionalFiles = ["tsconfig.json", ".env", ".env.example", ".gitignore"];
  for (const fileName of additionalFiles) {
    const templateFilePath = import_path8.default.join(templatePath, fileName);
    const projectFilePath = import_path8.default.join(projectPath, fileName);
    if (await import_fs_extra8.default.pathExists(templateFilePath)) {
      let content = await import_fs_extra8.default.readFile(templateFilePath, "utf-8");
      content = content.replace(/\{\{PROJECT_NAME\}\}/g, opts.name);
      await import_fs_extra8.default.writeFile(projectFilePath, content);
      files.push(projectFilePath);
      log(`\u2705 Created file: ${fileName}`);
    }
  }
  if (framework === "express") {
    const indexPath = import_path8.default.join(srcPath, "routes", "index.ts");
    const authPath = import_path8.default.join(srcPath, "routes", "auth.ts");
    await import_fs_extra8.default.writeFile(indexPath, indexRouteContent(opts.name));
    await import_fs_extra8.default.writeFile(authPath, authRouteContent);
    files.push(indexPath, authPath);
    log("\u2705 Created file: src/routes/index.ts");
    log("\u2705 Created file: src/routes/auth.ts");
  }
  const jwtSecret = generateSecret(64);
  const jwtRefreshSecret = generateSecret(64);
  const envFilePath = import_path8.default.join(projectPath, ".env");
  let envContent;
  if (await import_fs_extra8.default.pathExists(envFilePath)) {
    envContent = await import_fs_extra8.default.readFile(envFilePath, "utf-8");
    envContent = envContent.replace(/\{\{PROJECT_NAME\}\}/g, opts.name);
  } else {
    envContent = `# Environment Configuration
NODE_ENV=development
PORT=8000

# Database
MONGODB_URI=mongodb://localhost:27017/${opts.name}

# JWT Configuration (auto-generated secure secrets)
JWT_SECRET=REPLACE_WITH_AUTO_GENERATED_SECRET
JWT_REFRESH_SECRET=REPLACE_WITH_AUTO_GENERATED_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5000

# API Configuration
API_URL=http://localhost:8000

# Pagination Configuration
DEFAULT_PAGE_LIMIT=10
MAX_PAGE_LIMIT=100`;
  }
  envContent = envContent.replace(/REPLACE_WITH_AUTO_GENERATED_SECRET/, jwtSecret);
  envContent = envContent.replace(/REPLACE_WITH_AUTO_GENERATED_SECRET/, jwtRefreshSecret);
  await import_fs_extra8.default.writeFile(envFilePath, envContent);
  if (!files.includes(envFilePath)) files.push(envFilePath);
  log("\u2705 Created file: .env (with auto-generated JWT secrets)");
  const kotiConfig = {
    framework,
    kotiVersion: getVersion(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const configPath = import_path8.default.join(projectPath, "koti.config.json");
  await import_fs_extra8.default.writeFile(configPath, JSON.stringify(kotiConfig, null, 2));
  files.push(configPath);
  log("\u2705 Created file: koti.config.json");
  log("\n\u{1F389} TypeScript project created successfully!");
  if (!opts.skipInstall) {
    log("\n\u{1F4E6} Installing dependencies...");
    let installed = await runInstall(projectPath, "bun", 15e4, log);
    if (!installed) {
      log("\u26A0\uFE0F  Bun install failed or timed out, trying npm install...");
      installed = await runInstall(projectPath, "npm", 15e4, log);
    }
    if (installed) {
      log("\u2705 Dependencies installed successfully!");
    } else {
      warnings.push('Dependencies not installed \u2014 run "bun install" (or npm install) inside the project');
    }
  }
  return { projectPath, files: [projectPath, ...files], warnings };
};

// src/cli.ts
var program2 = new Command();
var colors = {
  green: (text) => `\x1B[32m${text}\x1B[0m`,
  blue: (text) => `\x1B[34m${text}\x1B[0m`,
  yellow: (text) => `\x1B[33m${text}\x1B[0m`,
  red: (text) => `\x1B[31m${text}\x1B[0m`,
  cyan: (text) => `\x1B[36m${text}\x1B[0m`,
  bold: (text) => `\x1B[1m${text}\x1B[0m`,
  dim: (text) => `\x1B[2m${text}\x1B[0m`
};
var enumTypes = ["string", "number"];
var createReadlineInterface = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
};
var askQuestion = (rl, question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
};
program2.name("koti").description("\u26A0\uFE0F  DEVELOPMENT VERSION: CLI tool to generate TypeScript Bun API projects with Express and MongoDB\n    This is an initial development release and may contain errors or bugs.\n    Use at your own discretion and always review generated code before production use.").version(getVersion());
program2.command("model").argument("<model-name>", "Name of the model to create").description("Create a new TypeScript model with schema registry").action(async (modelName) => {
  try {
    console.log(colors.blue(`\u{1F3D7}\uFE0F Creating TypeScript model: ${capitalize(modelName)}`));
    const rl = createReadlineInterface();
    const fields = [];
    console.log(colors.cyan("\n\u{1F4DD} Define your model fields:"));
    console.log(colors.dim("Available data types:"));
    console.log(colors.dim("1. String    2. Number    3. Date      4. Boolean"));
    console.log(colors.dim("5. ObjectId  6. Array     7. Mixed     8. JSON"));
    console.log(colors.dim('Type "done" when finished\n'));
    const dataTypes = ["String", "Number", "Date", "Boolean", "ObjectId", "Array", "Mixed", "JSON"];
    let fieldName = "";
    while (fieldName !== "done") {
      fieldName = await askQuestion(rl, colors.yellow('Field name (or "done" to finish): '));
      if (fieldName === "done") break;
      if (!fieldName.trim()) continue;
      console.log(colors.cyan("\nSelect data type:"));
      dataTypes.forEach((type, index) => {
        console.log(colors.dim(`${index + 1}. ${type}`));
      });
      const typeChoice = await askQuestion(rl, colors.yellow("Enter type number (1-8): "));
      const typeIndex = parseInt(typeChoice) - 1;
      if (typeIndex < 0 || typeIndex >= dataTypes.length) {
        console.log(colors.red("\u274C Invalid choice. Please select 1-8."));
        continue;
      }
      const fieldType = dataTypes[typeIndex];
      const isRequired = (await askQuestion(rl, colors.yellow("Required? (y/n): "))).toLowerCase() === "y";
      const isUnique = (await askQuestion(rl, colors.yellow("Unique? (y/n): "))).toLowerCase() === "y";
      const isIndexed = (await askQuestion(rl, colors.yellow("Add index? (y/n): "))).toLowerCase() === "y";
      const defaultValue = await askQuestion(rl, colors.yellow("Default value (press enter to skip): "));
      fields.push({
        name: fieldName,
        type: fieldType,
        required: isRequired,
        unique: isUnique || void 0,
        index: isIndexed || void 0,
        default: defaultValue || void 0
      });
      console.log(colors.green(`\u2705 Added field: ${fieldName} (${fieldType})`));
    }
    const generateCRUD = (await askQuestion(rl, colors.cyan("\n\u{1F527} Generate CRUD operations (controller, service, routes)? (y/n): "))).toLowerCase() === "y";
    let withTasks = false;
    if (generateCRUD) {
      withTasks = (await askQuestion(rl, colors.cyan("\u{1F510} Add CRUD tasks for permission control? (y/n): "))).toLowerCase() === "y";
    }
    rl.close();
    const result = await createModel({
      projectRoot: process.cwd(),
      name: modelName,
      fields,
      crud: generateCRUD,
      tasks: withTasks
    });
    const ctx = await resolveProject(process.cwd());
    const isElysia = ctx.framework === "elysia";
    const crudCamelName = toCamelCase(modelName);
    console.log(colors.green(`\u2705 Created TypeScript model: src/models/${capitalize(modelName)}.ts`));
    console.log(colors.green(`\u2705 Updated export in src/models/index.ts`));
    const indexedFieldNames = fields.filter((f) => f.index).map((f) => f.name);
    if (indexedFieldNames.length > 0) {
      console.log(colors.dim(`   Indexed fields (now applied to the schema): ${indexedFieldNames.join(", ")}`));
    }
    if (generateCRUD) {
      const tasksActuallyAdded = withTasks && result.files.some((f) => f.endsWith(path9.join("src", "enums", "Task.ts")));
      if (withTasks) {
        if (tasksActuallyAdded) {
          const upperSnakeName = toUpperSnakeCase(modelName);
          console.log(colors.green(`\u2705 Added CRUD tasks to src/enums/Task.ts`));
          console.log(colors.dim(`   VIEW_${upperSnakeName}, CREATE_${upperSnakeName}, UPDATE_${upperSnakeName}, DELETE_${upperSnakeName}`));
        } else {
          console.log(colors.yellow(`\u26A0\uFE0F  Could not add tasks (Task.ts not found or tasks already exist)`));
        }
      }
      console.log(colors.green(`\u2705 Created TypeScript controller: src/controllers/${crudCamelName}Controller.ts`));
      console.log(colors.green(`\u2705 Created TypeScript service: src/services/${crudCamelName}Service.ts`));
      console.log(colors.green(`\u2705 Created ${isElysia ? "TypeBox validator" : "Joi validation"}: src/validators/${crudCamelName}.ts`));
      console.log(colors.green(`\u2705 Created TypeScript routes: src/routes/${crudCamelName}.ts`));
      console.log(colors.green(`\u2705 Registered route in src/routes/index.ts`));
      console.log(colors.cyan("\n\u{1F4DA} Generated CRUD system includes:"));
      console.log("   \u2022 Model with Mongoose schema and TypeScript types");
      console.log("   \u2022 Controller with full CRUD operations (GET, POST, PUT, DELETE)");
      console.log("   \u2022 Service layer with business logic and pagination");
      console.log("   \u2022 Routes with Swagger documentation");
      console.log("   \u2022 Pagination support (configurable in .env - DEFAULT_PAGE_LIMIT)");
      console.log("   \u2022 Automatic route registration");
      if (tasksActuallyAdded) {
        console.log("   \u2022 CRUD tasks added to Task enum (VIEW, CREATE, UPDATE, DELETE)");
        console.log("   \u2022 Routes protected with checkPermission middleware");
      }
      console.log(colors.yellow("\n\u{1F527} Next steps:"));
      console.log("   \u2022 Update .env file with DEFAULT_PAGE_LIMIT (default: 10)");
      if (tasksActuallyAdded) {
        console.log("   \u2022 Assign the new tasks to roles via your admin panel or seed script");
      }
      console.log("   \u2022 Run TypeScript compilation: npm run build");
      console.log("   \u2022 Test the CRUD endpoints in your API");
    } else {
      console.log(colors.cyan("\n\u{1F4DA} Model created successfully!"));
      console.log(colors.yellow("\u{1F527} Next steps:"));
      console.log("   \u2022 Import the model in your controllers");
      console.log('   \u2022 Use "koti controller", "koti service" for CRUD operations');
      console.log("   \u2022 Run TypeScript compilation: npm run build");
    }
    result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
    result.warnings.forEach((w) => console.log(colors.yellow(`\u26A0\uFE0F  ${w}`)));
  } catch (error) {
    if (error instanceof GeneratorError) {
      console.error(colors.red(`\u274C ${error.message}`));
    } else {
      console.error(colors.red("\u274C Unexpected error:"), error.message);
    }
    process.exit(1);
  }
});
program2.command("enum").argument("<enum-name>", "Name of the enum to create").description("Create a new TypeScript enum").action(async (enumName) => {
  try {
    console.log(colors.blue(`\u{1F4CB} Creating TypeScript enum: ${capitalize(enumName)}`));
    const rl = createReadlineInterface();
    const enumType = await askQuestion(rl, colors.yellow("Enum type (string/number): "));
    if (!enumTypes.includes(enumType)) {
      console.log(colors.red('\u274C Invalid enum type. Use "string" or "number"'));
      rl.close();
      process.exit(1);
    }
    const values = [];
    console.log(colors.cyan("\n\u{1F4DD} Define your enum values:"));
    console.log(colors.dim('Type "done" when finished\n'));
    let key = "";
    while (key !== "done") {
      key = await askQuestion(rl, colors.yellow('Enum key (or "done" to finish): '));
      if (key === "done") break;
      if (!key.trim()) continue;
      let value;
      if (enumType === "string") {
        value = await askQuestion(rl, colors.yellow(`String value for ${key}: `));
      } else {
        const numValue = await askQuestion(rl, colors.yellow(`Number value for ${key}: `));
        value = parseInt(numValue);
      }
      values.push({ key: key.toUpperCase(), value });
      console.log(colors.green(`\u2705 Added: ${key.toUpperCase()} = ${value}`));
    }
    rl.close();
    const result = await createEnum({
      projectRoot: process.cwd(),
      name: enumName,
      enumType,
      values
    });
    console.log(colors.green(`\u2705 Created TypeScript enum: src/enums/${capitalize(enumName)}.ts`));
    console.log(colors.green(`\u2705 Updated export in src/enums/index.ts`));
    result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
    result.warnings.forEach((w) => console.log(colors.yellow(`\u26A0\uFE0F  ${w}`)));
  } catch (error) {
    if (error instanceof GeneratorError) {
      console.error(colors.red(`\u274C ${error.message}`));
    } else {
      console.error(colors.red("\u274C Unexpected error:"), error.message);
    }
    process.exit(1);
  }
});
program2.command("controller").argument("<controller-name>", "Name of the controller to create").description("Create a new TypeScript controller").action(async (controllerName) => {
  try {
    console.log(colors.blue(`\u{1F3AE} Creating TypeScript controller: ${capitalize(controllerName)}`));
    const result = await createController({ projectRoot: process.cwd(), name: controllerName });
    console.log(colors.green(`\u2705 Created TypeScript controller: src/controllers/${toCamelCase(controllerName)}Controller.ts`));
    console.log(colors.green(`\u2705 Updated export in src/controllers/index.ts`));
    result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
    result.warnings.forEach((w) => console.log(colors.yellow(`\u26A0\uFE0F  ${w}`)));
  } catch (error) {
    if (error instanceof GeneratorError) {
      console.error(colors.red(`\u274C ${error.message}`));
    } else {
      console.error(colors.red("\u274C Unexpected error:"), error.message);
    }
    process.exit(1);
  }
});
program2.command("service").argument("<service-name>", "Name of the service to create").description("Create a new TypeScript service").action(async (serviceName) => {
  try {
    console.log(colors.blue(`\u2699\uFE0F Creating TypeScript service: ${capitalize(serviceName)}`));
    const result = await createService({ projectRoot: process.cwd(), name: serviceName });
    console.log(colors.green(`\u2705 Created TypeScript service: src/services/${toCamelCase(serviceName)}Service.ts`));
    console.log(colors.green(`\u2705 Updated export in src/services/index.ts`));
    result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
    result.warnings.forEach((w) => console.log(colors.yellow(`\u26A0\uFE0F  ${w}`)));
  } catch (error) {
    if (error instanceof GeneratorError) {
      console.error(colors.red(`\u274C ${error.message}`));
    } else {
      console.error(colors.red("\u274C Unexpected error:"), error.message);
    }
    process.exit(1);
  }
});
program2.command("middleware").argument("<middleware-name>", "Name of the middleware to create").description("Create a new TypeScript middleware").action(async (middlewareName) => {
  try {
    console.log(colors.blue(`\u{1F6E1}\uFE0F Creating TypeScript middleware: ${toCamelCase(middlewareName)}`));
    const result = await createMiddleware({ projectRoot: process.cwd(), name: middlewareName });
    console.log(colors.green(`\u2705 Created TypeScript middleware: src/middleware/${toCamelCase(middlewareName)}.ts`));
    console.log(colors.green(`\u2705 Updated export in src/middleware/index.ts`));
    result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
    result.warnings.forEach((w) => console.log(colors.yellow(`\u26A0\uFE0F  ${w}`)));
  } catch (error) {
    if (error instanceof GeneratorError) {
      console.error(colors.red(`\u274C ${error.message}`));
    } else {
      console.error(colors.red("\u274C Unexpected error:"), error.message);
    }
    process.exit(1);
  }
});
program2.command("new").alias("create").argument("<project-name>", "Name of the project to create").option("--framework <framework>", "Framework choice: express or elysia (default: express)").description("Create a new TypeScript Bun API project").action(async (projectName, options) => {
  var _a;
  try {
    let framework = (_a = options == null ? void 0 : options.framework) == null ? void 0 : _a.toLowerCase();
    if (!framework) {
      if (process.stdin.isTTY) {
        const rl = createReadlineInterface();
        const answer = (await askQuestion(
          rl,
          colors.cyan("\n\u{1F4E6} Choose a framework:\n  1) Express (default)\n  2) Elysia\nEnter choice [1-2 or name]: ")
        )).trim().toLowerCase();
        rl.close();
        framework = answer === "2" || answer === "elysia" ? "elysia" : "express";
      } else {
        framework = "express";
      }
    }
    if (!FRAMEWORKS.includes(framework)) {
      console.error(colors.red("Error: Framework must be either express or elysia"));
      process.exit(1);
    }
    const result = await createProject({
      name: projectName,
      framework,
      log: (m) => console.log(m)
    });
    result.warnings.forEach((w) => console.log(colors.yellow(`\u26A0\uFE0F  ${w}`)));
    console.log(colors.cyan("\n\u{1F4CB} Next steps:"));
    console.log(`   1. cd ${projectName}`);
    console.log("   2. Update .env file with your MongoDB URI and JWT secret");
    console.log("   3. Start MongoDB server");
    console.log("   4. bun run dev");
    console.log(colors.blue("\n\u{1F4DA} Useful commands:"));
    console.log("   \u2022 npm run build   - Build TypeScript to JavaScript");
    console.log("   \u2022 npm start       - Start production server");
    console.log("   \u2022 bun run dev     - Start development server with Bun");
    console.log("   \u2022 npm run dev:ts  - Start development server with ts-node");
    console.log(colors.cyan("\n\u{1F310} Default endpoints:"));
    console.log("   \u2022 http://localhost:8000/health     - Health check");
    console.log("   \u2022 http://localhost:8000/api/       - API welcome");
    console.log("   \u2022 http://localhost:8000/api-docs   - Swagger documentation");
    console.log(colors.cyan("\n\u{1F510} Authentication endpoints:"));
    console.log("   \u2022 POST /api/auth/register - Register user");
    console.log("   \u2022 POST /api/auth/login    - Login user");
    console.log("   \u2022 GET  /api/auth/me       - Get current user");
    console.log(colors.yellow("\n\u{1F4A1} Don't forget to:"));
    console.log("   \u2022 Set up your MongoDB database");
    console.log("   \u2022 Generate a secure JWT secret");
    console.log("   \u2022 Configure your environment variables");
    console.log("   \u2022 Review the generated TypeScript code");
    console.log(colors.red("\n\u26A0\uFE0F  IMPORTANT DISCLAIMER:"));
    console.log(`   \u2022 This is a development version (v${getVersion()}) and may contain errors`);
    console.log("   \u2022 Review all generated code before production use");
    console.log("   \u2022 Test thoroughly in development environments");
    console.log("   \u2022 Update dependencies to latest secure versions");
    console.log(colors.green("\nHappy coding! \u{1F680}"));
  } catch (error) {
    if (error instanceof GeneratorError) {
      console.error(colors.red(`\u274C ${error.message}`));
    } else {
      console.error(colors.red("\u274C Error creating project:"), error.message);
    }
    process.exit(1);
  }
});
program2.command("model:edit").argument("<model-name>", "Name of the model to edit").description("Edit an existing TypeScript model (add/delete fields)").action(async (modelName) => {
  try {
    console.log(colors.blue(`\u270F\uFE0F Editing TypeScript model: ${capitalize(modelName)}`));
    let existingFields;
    const manifestEntry = (await readModelManifest(process.cwd()))[capitalize(modelName)];
    if (manifestEntry) {
      existingFields = manifestEntry.fields;
    } else {
      try {
        existingFields = await parseExistingModel(process.cwd(), modelName);
      } catch (error) {
        if (error instanceof GeneratorError) {
          console.log(colors.red(`\u274C Model ${capitalize(modelName)} not found!`));
          console.log(colors.yellow('\u{1F4A1} Use "koti model <name>" to create a new model'));
          process.exit(1);
        }
        throw error;
      }
    }
    const editCamelName = toCamelCase(modelName);
    const controllerPath = path9.join(process.cwd(), "src", "controllers", `${editCamelName}Controller.ts`);
    const servicePath = path9.join(process.cwd(), "src", "services", `${editCamelName}Service.ts`);
    const routePath = path9.join(process.cwd(), "src", "routes", `${editCamelName}.ts`);
    const [hasController, hasService, hasRoutes] = await Promise.all([
      fs9.pathExists(controllerPath),
      fs9.pathExists(servicePath),
      fs9.pathExists(routePath)
    ]);
    const hasCRUD = hasController || hasService || hasRoutes;
    console.log(colors.green(`\u2705 Found model: ${capitalize(modelName)}`));
    console.log(colors.dim(`   Fields: ${existingFields.map((f) => f.name).join(", ")}`));
    if (hasCRUD) {
      console.log(colors.cyan("\u{1F527} CRUD operations detected:"));
      if (hasController) console.log(colors.dim("   \u2022 Controller"));
      if (hasService) console.log(colors.dim("   \u2022 Service"));
      if (hasRoutes) console.log(colors.dim("   \u2022 Routes"));
    }
    const rl = createReadlineInterface();
    let updatedFields = [...existingFields];
    const addFields = [];
    const removeFields = [];
    let updateCRUD = false;
    while (true) {
      console.log(colors.cyan("\n\u{1F4DD} Current fields:"));
      updatedFields.forEach((field, index) => {
        const attrs = [];
        if (field.required) attrs.push("required");
        if (field.unique) attrs.push("unique");
        if (field.default) attrs.push(`default: ${field.default}`);
        const attrStr = attrs.length > 0 ? ` (${attrs.join(", ")})` : "";
        console.log(colors.dim(`   ${index + 1}. ${field.name}: ${field.type}${attrStr}`));
      });
      console.log(colors.yellow("\n\u{1F527} Available actions:"));
      console.log("   1. Add new field");
      console.log("   2. Delete field");
      console.log("   3. Save changes");
      console.log("   4. Cancel");
      const action = await askQuestion(rl, colors.yellow("Choose action (1-4): "));
      if (action === "1") {
        console.log(colors.cyan("\n\u2795 Adding new field:"));
        console.log(colors.dim("Available data types:"));
        console.log(colors.dim("1. String    2. Number    3. Date      4. Boolean"));
        console.log(colors.dim("5. ObjectId  6. Array     7. Mixed     8. JSON"));
        const dataTypes = ["String", "Number", "Date", "Boolean", "ObjectId", "Array", "Mixed", "JSON"];
        const fieldName = await askQuestion(rl, colors.yellow("Field name: "));
        if (!fieldName.trim()) {
          console.log(colors.red("\u274C Field name cannot be empty"));
          continue;
        }
        if (updatedFields.some((f) => f.name === fieldName)) {
          console.log(colors.red(`\u274C Field "${fieldName}" already exists`));
          continue;
        }
        console.log(colors.cyan("\nSelect data type:"));
        dataTypes.forEach((type, index) => {
          console.log(colors.dim(`${index + 1}. ${type}`));
        });
        const typeChoice = await askQuestion(rl, colors.yellow("Enter type number (1-8): "));
        const typeIndex = parseInt(typeChoice) - 1;
        if (typeIndex < 0 || typeIndex >= dataTypes.length) {
          console.log(colors.red("\u274C Invalid choice. Please select 1-8."));
          continue;
        }
        const fieldType = dataTypes[typeIndex];
        const isRequired = (await askQuestion(rl, colors.yellow("Required? (y/n): "))).toLowerCase() === "y";
        const isUnique = (await askQuestion(rl, colors.yellow("Unique? (y/n): "))).toLowerCase() === "y";
        const isIndexed = (await askQuestion(rl, colors.yellow("Add index? (y/n): "))).toLowerCase() === "y";
        const defaultValue = await askQuestion(rl, colors.yellow("Default value (press enter to skip): "));
        const newField = {
          name: fieldName,
          type: fieldType,
          required: isRequired,
          unique: isUnique || void 0,
          index: isIndexed || void 0,
          default: defaultValue || void 0
        };
        updatedFields.push(newField);
        addFields.push(newField);
        console.log(colors.green(`\u2705 Added field: ${fieldName} (${fieldType})`));
      } else if (action === "2") {
        if (updatedFields.length === 0) {
          console.log(colors.red("\u274C No fields to delete"));
          continue;
        }
        console.log(colors.cyan("\n\u{1F5D1}\uFE0F Delete field:"));
        updatedFields.forEach((field, index) => {
          console.log(colors.dim(`   ${index + 1}. ${field.name}: ${field.type}`));
        });
        const deleteChoice = await askQuestion(rl, colors.yellow("Enter field number to delete (or enter to cancel): "));
        if (!deleteChoice.trim()) continue;
        const deleteIndex = parseInt(deleteChoice) - 1;
        if (deleteIndex >= 0 && deleteIndex < updatedFields.length) {
          const deletedField = updatedFields.splice(deleteIndex, 1)[0];
          console.log(colors.green(`\u2705 Deleted field: ${deletedField.name}`));
          const addedIndex = addFields.findIndex((f) => f.name === deletedField.name);
          if (addedIndex >= 0) {
            addFields.splice(addedIndex, 1);
          } else {
            removeFields.push(deletedField.name);
          }
        } else {
          console.log(colors.red("\u274C Invalid field number"));
        }
      } else if (action === "3") {
        const hasChanges = addFields.length > 0 || removeFields.length > 0;
        if (!hasChanges) {
          console.log(colors.yellow("\u2139\uFE0F No changes detected"));
          break;
        }
        console.log(colors.cyan("\n\u{1F4BE} Saving changes..."));
        if (hasCRUD) {
          console.log(colors.cyan("\n\u{1F504} CRUD operations detected"));
          updateCRUD = (await askQuestion(rl, colors.yellow("Update CRUD operations with new schema? (y/n): "))).toLowerCase() === "y";
        }
        const result = await editModel({
          projectRoot: process.cwd(),
          name: modelName,
          addFields,
          removeFields,
          updateCrud: updateCRUD
        });
        console.log(colors.green(`\u2705 Updated model: src/models/${capitalize(modelName)}.ts`));
        if (updateCRUD) {
          console.log(colors.blue("\u{1F504} Updating CRUD operations..."));
          if (result.files.includes(controllerPath)) {
            console.log(colors.green(`\u2705 Updated controller: src/controllers/${editCamelName}Controller.ts`));
            console.log(colors.dim(`   Backup saved: src/controllers/${editCamelName}Controller.ts.bak`));
          }
          if (result.files.includes(servicePath)) {
            console.log(colors.green(`\u2705 Updated service: src/services/${editCamelName}Service.ts`));
            console.log(colors.dim(`   Backup saved: src/services/${editCamelName}Service.ts.bak`));
          }
          if (result.files.includes(routePath)) {
            console.log(colors.green(`\u2705 Updated routes: src/routes/${editCamelName}.ts`));
            console.log(colors.dim(`   Backup saved: src/routes/${editCamelName}.ts.bak`));
          }
          console.log(colors.green("\n\u2705 CRUD operations updated successfully!"));
          console.log(colors.cyan("\u{1F4A1} What happened:"));
          console.log(colors.dim("   \u2022 Previous files saved as .bak backups"));
          console.log(colors.dim("   \u2022 New code generated based on updated schema"));
          console.log(colors.dim("   \u2022 Files are clean and compilable \u2014 no commented-out code"));
          console.log(colors.dim("   \u2022 Both versions coexist in the same files for easy comparison"));
        }
        result.warnings.forEach((w) => console.log(colors.yellow(`\u26A0\uFE0F  ${w}`)));
        console.log(colors.cyan("\n\u{1F389} Model edit completed successfully!"));
        console.log(colors.yellow("\n\u{1F527} Next steps:"));
        console.log("   \u2022 Run TypeScript compilation: npm run build");
        console.log("   \u2022 Test your updated model and API endpoints");
        if (hasCRUD && !updateCRUD) {
          console.log("   \u2022 Consider manually updating CRUD operations if needed");
        }
        break;
      } else if (action === "4") {
        console.log(colors.yellow("\u2716\uFE0F Edit cancelled"));
        break;
      } else {
        console.log(colors.red("\u274C Invalid choice. Please select 1-4."));
      }
    }
    rl.close();
  } catch (error) {
    if (error instanceof GeneratorError) {
      console.error(colors.red(`\u274C ${error.message}`));
    } else {
      console.error(colors.red("\u274C Error editing model:"), error.message);
    }
    process.exit(1);
  }
});
program2.command("task").argument("<task-name>", "Name of the task to create (e.g., MANAGE_USERS)").description("Add a new task to the Task enum for role-based authorization").action(async (taskName) => {
  try {
    const taskKey = taskName.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const rl = createReadlineInterface();
    const description = await askQuestion(rl, colors.yellow("Task description: "));
    rl.close();
    if (!description.trim()) {
      console.log(colors.red("\u274C Description is required"));
      process.exit(1);
    }
    const result = await createTask({
      projectRoot: process.cwd(),
      name: taskKey,
      description
    });
    console.log(colors.green(`\u2705 Added task: ${taskKey}`));
    console.log(colors.dim(`   Description: ${description}`));
    console.log(colors.dim(`   File: src/enums/Task.ts`));
    result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
    result.warnings.forEach((w) => console.log(colors.yellow(`\u26A0\uFE0F  ${w}`)));
    console.log(colors.cyan("\n\u{1F4A1} Usage in routes:"));
    console.log(colors.dim(`   import { checkPermission } from '../middleware/checkPermission';`));
    console.log(colors.dim(`   import { Task } from '../enums/Task';`));
    console.log(colors.dim(`   router.get('/endpoint', auth, checkPermission(Task.${taskKey}), handler);`));
  } catch (error) {
    if (error instanceof GeneratorError) {
      console.error(colors.red(`\u274C ${error.message}`));
    } else {
      console.error(colors.red("\u274C Unexpected error:"), error.message);
    }
    process.exit(1);
  }
});
program2.parse();
