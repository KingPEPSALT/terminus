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
let cursor = true;
let speed = 500;
setInterval(() => {
    document.getElementById('cursor').style.opacity = +cursor;
    cursor = !cursor;
}, speed);

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

    find(name, directory){
        let idx = -1;
        if(directory === undefined) idx = this.subdirectories.findIndex(element=>element.name===name);
        else idx = this.subdirectories.findIndex(element=>element.name===name&&(directory ? element instanceof Directory : element instanceof FileObj));
        return idx===-1 ? null : this.subdirectories[idx];
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

const root = new Directory("root", [                    
    new Directory("documents", [new FileObj("about.txt", "All about me!"), new FileObj("this.txt", "All about this...")]),
    new Directory("pictures", [new FileObj("kitten.jpg", "Images aren't supported rn :(")])
]);
let current_dir = root;
let editing_file = false;
let current_file = null;
let command_list = {
    "echo":(x)=>x.join(" "),
    "clear":()=>document.getElementById("history").innerHTML="",
    "ls":(x)=>{
        if(x.length == 0) return current_dir.display();
        else{
            let dir = current_dir.find(x.join(" "), true);
            if (dir) return dir.display();
            return "could not find folder '"+x.join(" ")+"'";
        }
    },
    "cat":(x)=>{
        let file = current_dir.find(x.join(" "), false);
        if (file) return file.content; 
        return "could not find file '"+x.join(" ")+"'";
    },
    "cd":(x)=>{
        if (x.join(" ") === ".." && current_dir.parent != undefined) current_dir = current_dir.parent
        else if (x.join(" ") === "." || x.length === 0) return current_dir.path();
        else{
            let dir = current_dir.find(x.join(" "), true);
            if (dir) current_dir = dir;
            else return "could not find folder '"+x.join(" ")+"'";
        }
        return current_dir.path();
        
    },
    "mk":(x)=>{
        let dir = current_dir.find(x.join(" "), true);
        if (dir) return "a directory," + dir.show() + ", already exists.";
        return "directory " + current_dir.add(new Directory(x[0])).show() + " successfully created";
    },
    "new":(x)=>{
        let file = current_dir.find(x.join(" "), false);
        if (file) return "a file, " + file.show() + ", already exists.";
        return "file " + current_dir.add(new FileObj(x[0])).show() + " successfully created."
    },
    "edit":(x)=>{
        if(x.length == 0) return "a filename is required."
        let filename = x.shift();
        let file = current_dir.find(filename, false);
        if (!file) return "could not find file '"+filename+"'";
        current_file = file; editing_file = true;
        document.getElementById("edit-panel").style.display = "flex";
        document.getElementById("edit-file").value = file.content;
        document.getElementById("edit-file").focus();
        return "";
    },
    "changelog":()=>
        "\
        <strong>patch v0.1.5</strong><br>CRT filter added! Looks neat!<br><br><br>\
        <strong>patch v0.1.4</strong><br>Github! Now hosted on github pages!<br><br><br>\
        <strong>patch v0.1.3</strong><br>Big update! Removed the command <span class=\"cmd\">inp</span> for the way better command <span class=\"cmd\">edit</span><br><br><br>\
        <strong>patch v0.1.2</strong><br>Updated the code for cleanliness and ease of use! File/Folder objects should be much easier to use!<br><br><br>\
        <strong>patch v0.1.1</strong><br>Can now edit and create files and directories, use the <span class=\"cmd\">mk, new</span> and <span class=\"cmd\">inp</span> commands to create!<br><br><br> \
        <strong>patch v0.1.0</strong><br>Basic filesystem created and traversable, use the <span class=\"cmd\">cat, cd</span> and <span class=\"cmd\">ls</span> commands to traverse! "
    
}
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

let in_before = document.getElementById("typed-before");
let in_after = document.getElementById("typed-after");
let current_command = ""
document.addEventListener('keydown', (e)=>{
    if (editing_file) return;
    if (e.key == "Enter") {
        let inp = (in_before.innerHTML+in_after.innerHTML).trim().split(" ");
        let command = inp.shift();
        document.getElementById("history").innerHTML+= "$ " + command + " " + inp.join(" ")
        let output = "";
        if (command_list[command] == undefined && command!="help") output = "'" + command + "' is not a valid command. Type <span class=\"cmd\">help</span> for a list of commands.";
        else if (command=="help") {
            output = "List of commands:<br><br><span class=\"cmd\">help</span>";
            for(const key of Object.keys(command_list)){
                output += "<br><span class=\"cmd\">"+key+"</span>";
            }
        }
        else output = command_list[command](inp)
        if (command != "clear") document.getElementById("history").innerHTML += "<br>" + output + (output.length==0 ? "":"<br>") + "<br>";
        in_before.innerHTML="";
        in_after.innerHTML="";
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
    };
})