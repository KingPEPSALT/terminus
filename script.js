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
    constructor(name, content = "", parent, permissions=[]){
        super(name, parent);
        this.content = content;
        this.permissions = permissions;
    }
}

const root = new Directory("~", [                    
    new Directory("articles", [new FileObj("about.txt", "All about me!", undefined, ['EDIT']), new FileObj("this.txt", "All about this...", undefined, ['EDIT'])]),
    new FileObj("changelog.txt",
`<strong>patch v0.1.8</strong>
<br>Added <span class="cmd">code</span> command now to view and edit source code of files! Now <span class="cmd">edit</span> views (and edits) text only but with HTML styling applied. Check it out on the <span class="file">changelog.txt</span><br><br><br>

<strong>patch v0.1.7</strong>
<br>Fixed some bugs with file paths with help from the members of <span class='poppy-cult'>Poppy's Cult</span><br><br><br>
    
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
            return "Could not find folder '"+x[0]+"'";
        }
    },
    "cat":(x)=>{
        let file = current_dir.from_path(x[0]);
        if (file instanceof FileObj) return file.content; 
        return "Could not find file '"+x[0]+"'";
    },
    "cd":(x)=>{
        if(x[0]==undefined) return "";
        let dir = current_dir.from_path(x[0]);
        if (dir instanceof Directory) current_dir = dir;
        else return "Could not find folder '"+x[0]+"'";
        return "";
    },
    "mk":(x)=>{
        let dirname = x[0]
        let obj = current_dir.from_path(x[0], true);
        if (!obj) return x[0].split("/").pop().join("/")+" could not be resolved as a directory.";
        if (obj[1] != undefined) dirname = obj[1];
        if (!dirname_regex.test(dirname)) return "Invalid directory name.";
        if (obj[0].find(obj[1])) return "An object, " + obj[0].find(obj[1]).show() + ", already exists.";
        return "Directory " + obj[0].add(new Directory(dirname, undefined, undefined, ['DELETE', 'MOVE'])).show() + " successfully created";
    },
    "new":(x)=>{
        let filename = x[0];
        let obj = current_dir.from_path(x[0], true);
        if (!obj) return x[0].split("/").pop().join("/")+" could not be resolved as a directory.";
        if (obj[1] != undefined) filename = obj[1];
        if (!filename_regex.test(filename)) return "Invalid file name.";
        if (obj[0].find(obj[1])) return "An object, " + obj[0].find(obj[1]).show() + ", already exists";
        return "file " + obj[0].add(new FileObj(obj[1], undefined, undefined, ['EDIT', 'DELETE', 'MOVE'])).show() + " successfully created."
    },
    "edit":(x)=>{
        if(x.length == 0) return "A filename is required.";
        let filename = x.shift();
        let file = current_dir.from_path(filename);
        if (!(file instanceof FileObj)) return "Could not find file '"+filename+"'";
        current_file = file; editing_file = true;
        document.getElementById("edit").style.display = "flex";
        document.getElementById("edit-dialogue").innerHTML = file.content;
        document.getElementById("edit-dialogue").contentEditable = file.permissions.includes("EDIT");
        if(!file.permissions.includes("EDIT")) document.getElementById("write-btn").style.display = "none"; 
        else document.getElementById("write-btn").style.display = "inherit";
        document.getElementById("edit-dialogue").focus();
        return "";
    },
    "code":(x)=>{
        if(x.length == 0) return "A filename is required.";
        let filename = x.shift();
        let file = current_dir.from_path(filename);
        if (!(file instanceof FileObj)) return "Could not find file '"+filename+"'";
        current_file = file; editing_file = true;
        document.getElementById("code").style.display = "flex";
        document.getElementById("code-dialogue").value = file.content;
        document.getElementById("code-dialogue").readOnly = !file.permissions.includes("EDIT");
        if(!file.permissions.includes("EDIT")) document.getElementById("write-btn-code").style.display = "none"; 
        else document.getElementById("write-btn-code").style.display = "inherit";
        document.getElementById("code-dialogue").focus();
        return ""; 
    },
    "rm":(x)=>{
        if(x.length == 0) return "A file/directory name is required.";
        let filename = x.shift();
        let file = current_dir.from_path(filename);
        if(!file) "Could not find file/directory '"+filename+"'";
        if(!file.permissions.includes("DELETE")) return "You do not have permission to delete " + file.show() + ".";
        idx = file.parent.subdirectories.findIndex(el=>el.name==file.name);
        file.parent.subdirectories.splice(idx, 1);
        return "Successfully deleted " + file.show() + ".";
    }
    
}

/*ON-CLICK FUNCS*/
function close_file(){
    editing_file = false;
    current_file = null;
    document.getElementById("edit").style.display = "none";
    document.getElementById("code").style.display = "none";
}

function save_file(){
    editing_file = false;
    document.getElementById("edit").style.display = "none";
    current_file.content = document.getElementById("edit-file").innerHTML;
    current_file = null;
}

function code_file(){
    editing_file = false;
    document.getElementById("code").style.display = "none";
    current_file.content = document.getElementById("code-dialogue").value;
    current_file = null;
}

/* Key handling/input handling */
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