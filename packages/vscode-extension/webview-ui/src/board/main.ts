import { mount } from "svelte";
import "$lib/theme.css";
import Board from "./Board.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("Mount target #app not found");

mount(Board, { target });
