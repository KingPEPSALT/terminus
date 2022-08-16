String.prototype.insertChar=function(chr,pos){
    this.slice(0,pos) + chr + this.slice(pos);
};
String.prototype.removeAt=function(pos){
    this.slice(0, pos) + this.slice(pos+1);
}
document.scrollingElement.scroll(0, 1); //force scroll at start so it stays pinned
const [entry] = performance.getEntriesByType("navigation");
window.onload = ()=>{
    setTimeout(()=>{
        document.getElementById("load-time").innerHTML = Math.round(entry.duration);
    }, 0);
    let crtSlider = document.getElementById("crt-range");
    document.getElementById("crt-readout").innerHTML = (crtSlider.value/10).toFixed(1);
    document.getElementById("crt-filter").style.opacity = String(crtSlider.value/10);
};


const filename_regex = /^[a-zA-Z0-9_\-()£$!]+(\.[a-zA-Z0-9]+){0,1}$/
const dirname_regex = /^[a-zA-Z0-9_\-()£$!.]+$/
class FileSystemObject{
    constructor(name, parent, permissions){
        this.name = name;
        this.parent = parent;
        this.permissions = permissions;
    }

    path(){
        let traverser = this; let path = [];
        while(traverser != undefined){
            path.unshift(traverser.name);
            traverser = traverser.parent;
        } 
        return path.join("/");
    }
    
    show(){
        return "<span class=\""+(this instanceof Directory ? "dir" : "file")+"\">"+this.name+"</span>";
    }

    

}
class Directory extends FileSystemObject{
    constructor(name, subdirectories = [], parent, permissions = []){
        super(name, parent);
        this.subdirectories = subdirectories;
        for(let dir of this.subdirectories) dir.parent = this;
        this.permissions = permissions;
    }

    add(obj){
        obj.parent = this;
        this.subdirectories.push(obj);
        return obj;
    }

    find(name, is_directory){
        if(name == ".."){
            if(is_directory === false) return null;
            return this.parent;
        };
        let idx = -1;
        if(is_directory === undefined) idx = this.subdirectories.findIndex(element=>element.name===name);
        else idx = this.subdirectories.findIndex(element=>element.name===name&&(is_directory ? element instanceof Directory : element instanceof FileObj));
        return idx===-1 ? null : this.subdirectories[idx];
    }

    from_path(path, to_make = false){
        if(path == undefined) return null;
        path = path.trim();
        let cursor = this;
        let arr_path = path.split(/\\|\//);
        if (arr_path[0] == "~"){
            arr_path.shift();
            while(cursor.name != "~")
                cursor = cursor.parent;
        }
        if(!cursor) return null;
        if(arr_path.length == 0) return cursor;
        let target = arr_path.pop();
        
        for(let dir of arr_path){
            if (dir === ".") continue;
            if (dir === "..") {
                if (cursor == root) return null;
                cursor = cursor.parent; 
                continue;
            };
            let next = cursor.find(dir);
            if (!cursor) return null;
            if (next instanceof FileObj) return null;
            cursor = next;
        }
        if (!cursor) return null;
        if (to_make) return [cursor, target];
        else return cursor.find(target)
    }

    display(){
        return "<span class=\"dir\">" + (this.parent!=undefined?".. ":"") + ". </span>" + this.subdirectories.map(f=>f.show()).join(" ");
    }

}
class FileObj extends FileSystemObject{
    constructor(name, content = "", parent, permissions=[]){
        super(name, parent);
        this.content = content;
        this.permissions = permissions;
    }
}

class Command{
    constructor(name, func, description, requires_args=false){
        this.name = name;
        this.func = func;
        this.description = description;
        this.requires_args = requires_args;
    }
}
let command_list = new Map([
    ["help", new Command("help", (args)=>{
        let specified_cmd = args.shift();
        let out = ""
        if(specified_cmd == undefined){
            out = "List of commands:<br>";
            for(const cmd of command_list.values()){
                out += "<br><span class='cmd'>"+cmd.name+"</span> - " + cmd.description;
            }
            out +="<br><br> Type <span class='cmd'>help</span> [command name] for a brief description of a command"
        }else{
            let elaborated_cmd = command_list.get(specified_cmd);
            if(elaborated_cmd == undefined)
                out = "That is not a valid command. Type <span class='cmd'>help</span> [command name] for a brief description of a command or <span class='cmd'>help</span> for a list of commands.";
            else out = open_file_window("~/sys/manuals/"+elaborated_cmd.name+".man", true) ? "" : "A manual page could not be found for <span class='cmd'>"+elaborated_cmd.name+"</span>";
        }
        return out;
    }, "provides info on the commands")],
    ["echo", new Command("echo", (args)=>{return args.join(" ")}, "outputs the input")],

    ["clear", new Command("clear", (args)=>{document.getElementById("history").innerHTML=""}, "clears the terminal")],

    ["ls", new Command("ls", (args)=>{
        if(args.join(" ").trim().length == 0) return current_dir.display();
        else{
            let dirname = args.shift();
            let dir = current_dir.from_path(dirname);
            if (dir instanceof Directory) return dir.display();
            return "Could not find folder '"+dirname+"'";
        }
    }, "lists objects in a directory")],

    ["cat", new Command("cat", (args)=>{
        let filename = args.shift();
        let file = current_dir.from_path(filename);
        if (file instanceof FileObj) return file.content; 
        return "Could not find file '"+filename+"'";
    }, "outputs a file with styling to the terminal", true)],

    ["cd", new Command("cd", (args)=>{
        if(args.join(" ").trim().length == 0) return "";
        let dirname = args.shift();
        let dir = current_dir.from_path(dirname);
        if (dir instanceof Directory) current_dir = dir;
        else return "Could not find folder '"+dirname+"'";
        return "";
    }, "changes the current directory")],

    ["mk", new Command("mk", (args)=>{
        let dirname = args.shift();
        let obj = current_dir.from_path(dirname, true);
        if (!obj) return dirname.split("/").pop().join("/")+" could not be resolved as a directory.";
        if (obj[1] != undefined) dirname = obj[1];
        if (!dirname_regex.test(dirname)) return "Invalid directory name.";
        if (obj[0].find(obj[1])) return "An object, " + obj[0].find(obj[1]).show() + ", already exists.";
        return "Directory " + obj[0].add(new Directory(dirname, undefined, undefined, ['DELETE', 'MOVE'])).show() + " successfully created";
    }, "creates a new directory", true)],

    ["new", new Command("new", (args)=>{
        let filename = args.shift();
        let obj = current_dir.from_path(filename, true);
        if (!obj) return filename.split("/").pop().join("/")+" could not be resolved as a directory.";
        if (obj[1] != undefined) filename = obj[1];
        if (!filename_regex.test(filename)) return "Invalid file name.";
        if (obj[0].find(obj[1])) return "An object, " + obj[0].find(obj[1]).show() + ", already exists";
        return "file " + obj[0].add(new FileObj(obj[1], undefined, undefined, ['EDIT', 'DELETE', 'MOVE'])).show() + " successfully created."
    }, "creates a new file", true)],

    ["edit", new Command("edit", (args)=>{
        let res = open_file_window(args.shift(), true);
        return res ? "" : "Could not find file.";
    }, "opens an existing file in an edit window with styling", true)],

    ["code", new Command("code", (args)=>{
        let res = open_file_window(args.shift(), false);
        return res ? "" : "Could not find file."; 
    }, "opens an existing file in an edit window without styling, source is shown", true)],

    ["rm", new Command("rm", (args)=>{
        let filename = args.shift();
        let file = current_dir.from_path(filename);
        if(!file) "Could not find file/directory '"+filename+"'";
        if(!file.permissions.includes("DELETE")) return "You do not have permission to delete " + file.show() + ".";
        idx = file.parent.subdirectories.findIndex(el=>el.name==file.name);
        file.parent.subdirectories.splice(idx, 1);
        return "Successfully deleted " + file.show() + ".";
    }, "deletes on object from the file system.", true)]

]);

function gen_manual_header(cmd, usage, content){
    return new FileObj(cmd.name+".man", 
`<div class="manual-head">${cmd.name} MANUAL PAGE</div><br>
USAGE: <span class="cmd">${cmd.name}</span> ${usage}<br><br>
${content}
`)
}

const root = new Directory("~", [                    
    new Directory("articles", [new FileObj("about.txt", "All about me!", undefined, ['EDIT']), new FileObj("this.txt", "All about this...", undefined, ['EDIT'])]),
    new FileObj("changelog.txt", 
`<strong>patch v0.1.10</strong>
<br>Settings panel created and CRT slider added, seems that UBlock Origin blocks this slider from working<br><br><br>

<strong>patch v0.1.9</strong>
<br>Manual pages now added! Type '<span class="cmd">help</span> help' for more info!<br><br><br>  

<strong>patch v0.1.8</strong>
<br>Added <span class="cmd">code</span> command now to view and edit source code of files! Now <span class="cmd">edit</span> views (and edits) text only but with HTML styling applied. Check it out on the <span class="file">changelog.txt</span><br><br><br>

<strong>patch v0.1.7</strong>
<br>Fixed some bugs with file paths!<br><br><br>
    
<strong>patch v0.1.6</strong>
<br>File paths now added! Try: <span class="cmd">edit</span> documents/about.txt!<br><br><br>  
          
<strong>patch v0.1.5</strong>
<br>CRT filter added! Looks neat!<br><br><br>        
    
<strong>patch v0.1.4</strong>
<br>Github! Now hosted on github pages!<br><br><br>  
          
<strong>patch v0.1.3</strong>
<br>Big update! Removed the command <span class="cmd">inp</span> for the way better command <span class="cmd">edit</span><br><br><br>        
    
<strong>patch v0.1.2</strong>
<br>Updated the code for cleanliness and ease of use! File/Folder objects should be much easier to use!<br><br><br>        
    
<strong>patch v0.1.1</strong>
<br>Can now edit and create files and directories, use the <span class="cmd">mk, new</span> and <span class="cmd">inp</span> commands to create!<br><br><br>         
    
<strong>patch v0.1.0</strong><br>Basic filesystem created and traversable, use the <span class="cmd">cat, cd</span> and <span class="cmd">ls</span> commands to traverse!`,
    undefined, ['DELETE']),
    new Directory("sys", [new Directory("manuals",[
        /* Command manuals */
        gen_manual_header(command_list.get("help"), "[command: OPTIONAL]", "The <span class='cmd'>help</span> command can either, when presented with no arugments, list all commands with a brief description, or it can present a more detailed description and usage of the command using the manual pages found in <span class='dir'>~/sys/manual</span>."),
        gen_manual_header(command_list.get("echo"), "[args: OPTIONAL]", "The <span class='cmd'>echo</span> command will print out it's input to the terminal raw, meaning no styling."),
        gen_manual_header(command_list.get("clear"), "", "The <span class='cmd'>clear</span> command will clear the terminal's displayed command history only and not the info text."),
        gen_manual_header(command_list.get("ls"), "[existing directory: OPTIONAL]", "The <span class='cmd'>ls</span> command will list all file system objects within a directory. When no directory is presented as an argument, the current directory is used instead."),
        gen_manual_header(command_list.get("cat"), "[existing file: REQUIRED]", "The <span class='cmd'>cat</span> command will print the stylised outputs of a file directly into the terminal."),
        gen_manual_header(command_list.get("cd"), "[existing directory: OPTIONAL]", "The <span class='cmd'>cd</span> command will change the current directory to that which was input. When no directory is presented as an argument, the current directory is printed to the terminal instead."),
        gen_manual_header(command_list.get("mk"), "[new directory: REQUIRED]", "The <span class='cmd'>mk</span> command will create a new directory named by the argument, the argument can also be a path to the potentially new directory however only one file system object can be created at a time so the path must exist up until the last object in the path."),
        gen_manual_header(command_list.get("new"), "[new file: REQUIRED]", "The <span class='cmd'>new</span> command will create a new file named by the argument, the argument can also be a path to the potentially new directory however only one file system object can be created at a time so the path must exist up until the last object in the path."),
        gen_manual_header(command_list.get("edit"), "[existing file: REQUIRED]", "The <span class='cmd'>edit</span> command will open a stylised window with the file content displayed, if the file is not readonly, one can edit this text and save the file."),
        gen_manual_header(command_list.get("code"), "[existing file: REQUIRED]", "The <span class='cmd'>code</span> command will open a non-stylised window with the file content displayed, this means that the source of stylised files can be seen. If the file is not readonly, one can edit the source of the file and even view style changes with the <span class='cmd'>cat</span> or <span class='cmd'>edit</span> commands."),
        gen_manual_header(command_list.get("rm"), ["existing file/directory: REQUIRED"], "The <span class='cmd'>rm</span> command will delete a directory or file that has the DELETE permission enabled, note that it will also delete everything within the directory.")
    ])])
], null);

let current_dir = root;
let editing_file = false;
let current_file = null;
let phone_focused = false

function open_file_window(filepath, style){
    let f = current_dir.from_path(filepath);
    if (!(f instanceof FileObj)) return false;
    current_file = f; editing_file = true;
    let panel_type = style ? "edit" : "code";
    /*
    I don't know why this fixes the issue I was having but I have an idea
    It seems that for some reason my browser sometimes skips this code, or the style gets reset instantly or something wacky.
    Putting this on a timer that is basically unoticeable seems to ensure that it is actually run 
    */
    setTimeout(()=> {
        document.getElementById(panel_type).style.display = "flex";
        let dialogue = document.getElementById(panel_type+"-dialogue");
        if(style){ dialogue.innerHTML = f.content; dialogue.contentEditable = f.permissions.includes("EDIT");}
        else { dialogue.value = f.content; dialogue.readOnly = !f.permissions.includes("EDIT"); }
        document.getElementById("write-btn-"+panel_type).style.display = f.permissions.includes("EDIT") ? "inherit" : "none";
        dialogue.focus();
    }, 20);
    return true;
    
}

/*ON-CLICK FUNCS*/
function close_file(){
    editing_file = false;
    current_file = null;
    [...document.getElementsByClassName("edit-panel")].forEach((el)=>el.style.display = "none");
}

function save_file(stylised){
    editing_file = false;
    document.getElementById(stylised ? "edit" : "code").style.display = "none";
    current_file.content = stylised ? document.getElementById("edit-dialogue").innerHTML : document.getElementById("code-dialogue").value;
    current_file = null;
}


/* Key handling/input handling */
let in_before = document.getElementById("typed-before");
let in_after = document.getElementById("typed-after");
let last_command = ""
document.addEventListener('keydown', (e)=>{
    if (["/", "'"].includes(e.key) && !editing_file) e.preventDefault();
    if (editing_file) return;
    if (e.key == "Enter") {
        let inp = (in_before.innerHTML+in_after.innerHTML).trim().split(" ");
        let typed_command = inp.shift();
        let command = command_list.get(typed_command);
        document.getElementById("history").innerHTML+= "<span class='dir'>"+current_dir.path() + "</span> $ " + typed_command + " " + inp.join(" ")
        let output = "";
        if (typed_command == "") output="";
        else if (command == undefined) output = "'" + typed_command + "' is not a valid command. Type <span class='cmd'>help</span> for a list of commands.";
        else if (typed_command == "") output="";
        else{
            if(command.requires_args && inp.join(" ").trim().length == 0) output = "Command <span class='cmd'>"+command.name+"</span> requires args. Type <span class='cmd'>help</span> "+command.name+" for more info.";
            else output = command.func(inp);
        }
        if (typed_command != "clear") document.getElementById("history").innerHTML += "<br>" + output + (output.length==0 ? "":"<br>") + "<br>";
        in_before.innerHTML=""; in_after.innerHTML="";
        document.getElementById("cur-dir").innerHTML = current_dir.path();
        last_command = typed_command;
        if(inp != "") last_command += " " + inp;
    }
    else if (e.key == "Backspace"){
        in_before.innerHTML = in_before.innerHTML.slice(0, in_before.innerHTML.length-1);
    }
    else if (e.key.length == 1) in_before.innerHTML += e.key;
    else if (e.key == "ArrowRight"){
        let to_move = in_after.innerHTML.charAt(0);
        in_after.innerHTML = in_after.innerHTML.slice(1);
        in_before.innerHTML += to_move; 
    }
    else if (e.key == "ArrowLeft"){
        let to_move = in_before.innerHTML.charAt(in_before.innerHTML.length-1);
        in_before.innerHTML = in_before.innerHTML.slice(0, in_before.innerHTML.length-1);
        in_after.innerHTML = to_move + in_after.innerHTML;
    }
    else if (e.key == "ArrowUp"){
        in_before.innerHTML = last_command;
        in_after.innerHTML = "";
    }
})

let toggleSettingsModal = () => {
    let settings = document.getElementById("settings-modal-content");
    settings.style.visibility = (settings.style.visibility === "visible") ? "hidden" : "visible";
}

document.getElementById("crt-range").oninput = function() {
    document.getElementById("crt-readout").innerHTML = (this.value/10).toFixed(1);
    document.getElementById("crt-filter").style.opacity = String(this.value/10);
}