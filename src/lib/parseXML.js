const fs = require('fs-extra');
const parser = require('fast-xml-parser');

const defaultKeys = [
  'id',
  'name',
  'overview',
  'description',
  'type',
  'pageURL',
  'downloadURL',
  'downloadMirrorURL',
  'latestVersion',
  'detailURL',
  'files',
];

/**
 * @param {object} parsedData - A object parsed from XML.
 * @returns {Array} An array of files.
 */
function parseFiles(parsedData) {
  const files = [];
  for (const file of parsedData.files[0].file) {
    const tmpFile = {
      filename: null,
      isOptional: false,
      isDirectory: false,
      archivePath: null,
    };
    if (typeof file === 'string') {
      tmpFile.filename = file;
    } else if (typeof file === 'object') {
      tmpFile.filename = file._[0];
      tmpFile.isOptional = Boolean(file.$optional);
      tmpFile.isDirectory = Boolean(file.$directory);
      if (file.$archivePath) tmpFile.archivePath = file.$archivePath;
    } else {
      break;
    }
    Object.freeze(tmpFile);
    files.push(tmpFile);
  }
  return files;
}

/**
 *
 */
class PluginInfo {
  /**
   * Returns the plugin's information.
   *
   * @param {object} parsedPlugin - An object parsed from XML.
   */
  constructor(parsedPlugin) {
    const keys = defaultKeys.concat('installer', 'installArg');
    for (const key of keys) {
      if (parsedPlugin[key]) {
        if (key === 'type') {
          this.type = parsedPlugin.type[0].split(' ');
        } else if (key === 'files') {
          this.files = parseFiles(parsedPlugin);
        } else {
          this[key] = parsedPlugin[key][0];
        }
      }
    }
    Object.freeze(this);
  }
}

/**
 *
 */
class ScriptInfo {
  /**
   *
   * @param {object} parsedScript - An object parsed from XML.
   */
  constructor(parsedScript) {
    const keys = defaultKeys.slice();
    for (const key of keys) {
      if (parsedScript[key]) {
        if (key === 'type') {
          this.type = parsedScript.type[0].split(' ');
        } else if (key === 'files') {
          this.files = parseFiles(parsedScript);
        } else {
          this[key] = parsedScript[key][0];
        }
      }
    }
    Object.freeze(this);
  }
}

const parseOptions = {
  attributeNamePrefix: '$',
  textNodeName: '_',
  ignoreAttributes: false,
  parseNodeValue: false,
  parseAttributeValue: false,
  trimValues: true,
  arrayMode: 'strict',
};

/**
 * An object which contains plugins list.
 */
class PluginsList extends Object {
  /**
   *
   * @param {string} xmlPath - The path of the XML file.
   * @returns {PluginsList} A list of plugins.
   */
  constructor(xmlPath) {
    super();
    const xmlData = fs.readFileSync(xmlPath, 'utf-8');
    const valid = parser.validate(xmlData);
    if (valid === true) {
      const pluginsInfo = parser.parse(xmlData, parseOptions);
      if (pluginsInfo.plugins) {
        for (const plugin of pluginsInfo.plugins[0].plugin) {
          this[plugin.id[0]] = new PluginInfo(plugin);
        }
      } else {
        throw new Error('The list is invalid.');
      }
    } else {
      throw valid;
    }
  }
}

/**
 * An object which contains scripts list.
 */
class ScriptsList extends Object {
  /**
   *
   * @param {string} xmlPath - The path of the XML file.
   * @returns {ScriptsList} A list of scripts.
   */
  constructor(xmlPath) {
    super();
    const xmlData = fs.readFileSync(xmlPath, 'utf-8');
    const valid = parser.validate(xmlData);
    if (valid === true) {
      const scriptsInfo = parser.parse(xmlData, parseOptions);
      if (scriptsInfo.scripts) {
        for (const script of scriptsInfo.scripts[0].script) {
          this[script.id[0]._] = new ScriptInfo(script);
        }
      } else {
        throw new Error('The list is invalid.');
      }
    } else {
      throw valid;
    }
  }
}

module.exports = {
  plugin: async function (pluginsListPath) {
    if (fs.existsSync(pluginsListPath)) {
      return new PluginsList(pluginsListPath);
    } else {
      throw new Error('The version file does not exist.');
    }
  },

  script: async function (scriptsListPath) {
    if (fs.existsSync(scriptsListPath)) {
      return new ScriptsList(scriptsListPath);
    } else {
      throw new Error('The version file does not exist.');
    }
  },
};
