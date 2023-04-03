#!/usr/bin/env node

import * as dotenv from "dotenv";
dotenv.config();
import { loadHCAD } from "./parsers/hcad.mjs";

loadHCAD();
