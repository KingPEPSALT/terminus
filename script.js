String.prototype.insertChar=function(chr,pos){
    this.slice(0,pos) + chr + this.slice(pos);
};
String.prototype.removeAt=function(pos){
    this.slice(0, pos) + this.slice(pos+1);
}

const [entry] = performance.getEntriesByType("navigation");
window.onload = ()=>{
    setTimeout(()=>{
        document.getElementById("load-time").innerHTML = entry.duration;
    }, 0);
};


const filename_regex = /^[a-zA-Z0-9_\-*()£$!?]+\.[a-zA-Z0-9]+$/
const dirname_regex = /^[a-zA-Z0-9_\-*()£$!?]+$/

class FileSystemObject{
    constructor(name, parent){
        this.name = name;
        this.parent = parent;
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
    constructor(name, subdirectories = [], parent){
        super(name, parent);
        this.subdirectories = subdirectories
        for(let dir of this.subdirectories) dir.parent = this;
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
        if (path.startsWith("~")) cursor = root;
        let arr_path = path.split(/\\|\//);
        let target = arr_path.pop();
        for(let dir of arr_path){
            if (dir === ".") continue;
            if (dir === "..") {
                if (cursor == root) return null;
                cursor = cursor.parent; 
                continue;
            };
            let next = cursor.find(dir);
            if (cursor === null) return null;
            if (next instanceof FileObj) return null;
            cursor = next;
        }
        if (cursor === null) return null;
        if (to_make) return [cursor, target];
        else return cursor.find(target)
    }

    display(){
        return "<span class=\"dir\">" + (this.parent!=undefined?".. ":"") + ". </span>" + this.subdirectories.map(f=>f.show()).join(" ");
    }

}
class FileObj extends FileSystemObject{
    constructor(name, content = "", parent){
        super(name, parent);
        this.content = content;
    }
}

const root = new Directory("~", [                    
    new Directory("documents", [new FileObj("about.txt", "All about me!"), new FileObj("this.txt", "All about this...")]),
    new FileObj("changelog.txt", "\
        <strong>patch v0.1.7</strong><br>Fixed some bugs with file paths with help from the members of <span id='poppy-cult'>Poppy's Cult</span><br><br><br>\
        <strong>patch v0.1.6</strong><br>File paths now added! Try: <span class=\"cmd\">edit</span> documents/about.txt!<br><br><br>\
        <strong>patch v0.1.5</strong><br>CRT filter added! Looks neat!<br><br><br>\
        <strong>patch v0.1.4</strong><br>Github! Now hosted on github pages!<br><br><br>\
        <strong>patch v0.1.3</strong><br>Big update! Removed the command <span class=\"cmd\">inp</span> for the way better command <span class=\"cmd\">edit</span><br><br><br>\
        <strong>patch v0.1.2</strong><br>Updated the code for cleanliness and ease of use! File/Folder objects should be much easier to use!<br><br><br>\
        <strong>patch v0.1.1</strong><br>Can now edit and create files and directories, use the <span class=\"cmd\">mk, new</span> and <span class=\"cmd\">inp</span> commands to create!<br><br><br> \
        <strong>patch v0.1.0</strong><br>Basic filesystem created and traversable, use the <span class=\"cmd\">cat, cd</span> and <span class=\"cmd\">ls</span> commands to traverse!"
    ),
    new Directory("pictures", [new FileObj("kitten.jpg", "Images aren't supported rn :(")])
], null);
let current_dir = root;
let editing_file = false;
let current_file = null;
let phone_focused = false

let command_list = {
    "echo":(x)=>x.join(" "),
    "clear":()=>document.getElementById("history").innerHTML="",
    "ls":(x)=>{
        if(x.length == 0) return current_dir.display();
        else{
            let dir = current_dir.from_path(x[0]);
            if (dir instanceof Directory) return dir.display();
            return "could not find folder '"+x[0]+"'";
        }
    },
    "cat":(x)=>{
        let file = current_dir.from_path(x[0]);
        if (file instanceof FileObj) return file.content; 
        return "could not find file '"+x[0]+"'";
    },
    "cd":(x)=>{
        if(x[0]==undefined) return "";
        let dir = current_dir.from_path(x[0]);
        if (dir instanceof Directory) current_dir = dir;
        else return "could not find folder '"+x[0]+"'";
        return "";
    },
    "mk":(x)=>{
        let dirname = x[0]
        let obj = current_dir.from_path(x[0], true);
        if (!obj) return x[0].split("/").pop().join("/")+" could not be resolved as a directory.";
        if (obj[1] != undefined) dirname = obj[1];
        if (!dirname_regex.test(dirname)) return "invalid directory name.";
        if (obj[0].find(obj[1])) return "an object, " + obj[0].find(obj[1]).show() + ", already exists.";
        return "directory " + obj[0].add(new Directory(dirname)).show() + " successfully created";
    },
    "new":(x)=>{
        let filename = x[0];
        let obj = current_dir.from_path(x[0], true);
        if (!obj) return x[0].split("/").pop().join("/")+" could not be resolved as a directory.";
        if (obj[1] != undefined) filename = obj[1];
        if (!filename_regex.test(filename)) return "invalid file name.";
        if (obj[0].find(obj[1])) return "an object, " + obj[0].find(obj[1]).show() + ", already exists";
        return "file " + obj[0].add(new FileObj(obj[1])).show() + " successfully created."
    },
    "edit":(x)=>{
        if(x.length == 0) return "a filename is required."
        let filename = x.shift();
        let file = current_dir.from_path(filename);
        if (!(file instanceof FileObj)) return "could not find file '"+filename+"'";
        current_file = file; editing_file = true;
        document.getElementById("edit-panel").style.display = "flex";
        document.getElementById("edit-file").value = file.content;
        document.getElementById("edit-file").focus();
        return "";
    },
    
}

/*ON-CLICK FUNCS*/
function close_file(){
    editing_file = false;
    current_file = null;
    document.getElementById("edit-panel").style.display = "none";
}

function save_file(){
    editing_file = false;
    document.getElementById("edit-panel").style.display = "none";
    current_file.content = document.getElementById("edit-file").value;
    current_file = null;
}

function phonefocus(){
    if (phone_focused) document.getElementById("phone-focus").blur()
    else document.getElementById("phone-focus").focus()
    phone_focused = !phone_focused;
}
let in_before = document.getElementById("typed-before");
let in_after = document.getElementById("typed-after");
let last_command = ""
document.addEventListener('keydown', (e)=>{
    if (editing_file) return;
    if (e.key == "Enter") {
        let inp = (in_before.innerHTML+in_after.innerHTML).trim().split(" ");
        let command = inp.shift();
        document.getElementById("history").innerHTML+= "<span class=\"dir\">"+current_dir.path() + "</span> $ " + command + " " + inp.join(" ")
        let output = "";
        if (command_list[command] == undefined && command!="help" && command!="") output = "'" + command + "' is not a valid command. Type <span class=\"cmd\">help</span> for a list of commands.";
        else if (command=="help") {
            output = "List of commands:<br><br><span class=\"cmd\">help</span>";
            for(const key of Object.keys(command_list)){
                output += "<br><span class=\"cmd\">"+key+"</span>";
            }
        }else if(command==""){
            output="";
        }
        else output = command_list[command](inp)
        if (command != "clear") document.getElementById("history").innerHTML += "<br>" + output + (output.length==0 ? "":"<br>") + "<br>";
        in_before.innerHTML="";
        in_after.innerHTML="";
        document.getElementById("cur-dir").innerHTML = current_dir.path();
        last_command = command
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