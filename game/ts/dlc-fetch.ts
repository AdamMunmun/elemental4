import { asyncAlert, asyncConfirm } from "./dialog";
import { installTheme, ThemeEntry } from "./theme";
import { getSupportedServerTypes } from './api';
import { resolve } from 'url';
import { version } from "../../package.json";
import { installServer } from "./savefile";
import { capitalize } from "@reverse/string";
import { THEME_VERSION } from "./theme-version";

export type DLCType = 'theme' | 'pack' | 'server';

const corsAnywhereBaseUrl = 'https://cors-anywhere.herokuapp.com/';
async function fetchCorsAnywhere(url: string, options?: RequestInit) {
  try {
    return await fetch(url, options);
  } catch (error) {
    return await fetch(corsAnywhereBaseUrl + url, options);
  }
}

export async function addDLCByUrl(url: string, intendedType: DLCType, isBuiltIn = false): Promise<ThemeEntry | object | null> {
  let json
  try {
    json = JSON.parse(url);
    url = location.origin + '/'
  } catch (error) {
    if (!url.endsWith('.json')) {
      url += (url.endsWith('/') ? '' : '/') + 'elemental.json';
    }
    try {
      json = await fetchCorsAnywhere(url).then(x => x.json());
    } catch (error) {
      if (isBuiltIn) {
        return null;
      }
      await asyncAlert('Error Adding DLC', 'Could not find an elemental.json file at this URL.');
      return null;
    }
  }
  if(!(
    typeof json === 'object'
    && json !== null
    && typeof json.type === 'string'
  )) {
    if (isBuiltIn) {
      return null;
    }
    await asyncAlert('Error Adding DLC', 'Found a malformed elemental.json file');
    return null;
  }
  
  if ((await getSupportedServerTypes()).includes(json.type)) {
    if(!(
      'name' in json
    )) {
      if (isBuiltIn) {
        return null;
      }
      await asyncAlert('Error Adding DLC', 'The specified server is missing metadata.');
      return null;
    }

    if (intendedType !== 'server' && (isBuiltIn || !await asyncConfirm('Not a ' + capitalize(intendedType), 'The url you provided points to an Elemental 4 Server, would you still like to add it?', 'Continue'))) {
      return null;
    }
    
    if(json.icon) {
      json.icon = resolve(url, json.icon);
    }

    await installServer(url, json);
  } else if (json.type === 'elemental4:theme') {
    if(!(
      'format_version' in json &&
      'id' in json &&
      'name' in json &&
      'description' in json
    )) {
      if (isBuiltIn) {
        return null;
      }
      await asyncAlert('Error Adding DLC', 'The specified theme is missing metadata.');
      return null;
    }
    
    if (intendedType !== 'theme' && !await asyncConfirm('Not a ' + capitalize(intendedType), 'The url you provided points to an Elemental 4 Theme, would you still like to add it?', 'Continue')) {
      return null;
    }
    if (json.format_version < THEME_VERSION && !await asyncConfirm('Incorrect Theme Version', 'This theme was made for an older version of Elemental 4, would you still like to use it.', 'Continue')) {
      return null;
    }
    if (json.format_version > THEME_VERSION && !await asyncConfirm('Incorrect Theme Version', 'This theme was made for an older version of Elemental 4, would you still like to use it.', 'Continue')) {
      return null;
    }
    
    if(json.styles) {
      json.styles = await fetchCorsAnywhere(resolve(url, json.styles)).then(x => x.text());
    }
    if(json.icon) {
      json.icon = resolve(url, json.icon);
    }

    json.isBuiltIn = isBuiltIn;
    if(isBuiltIn) {
      json.version = version;
    }

    await installTheme(json, true);
  } else if (json.type === 'pack') {
    if (isBuiltIn) {
      return null;
    }
    await asyncAlert('Error Adding DLC', 'Singleplayer mode has not been added yet.');
    return null;
  } else {
    if (isBuiltIn) {
      return null;
    }
    await asyncAlert('Error Adding DLC', 'Don\'t know how to add server type "' + json.type + '"');
    return null;
  }
}
