//Utiliser utilities, demander a chourot comment le joindre car j'y arrive pas.
const periodicRefreshPeriod = 10;
let contentScrollPosition = 0;
let selectedCategory = "";
let currentETag = "";
let hold_Periodic_Refresh = false;

Init_UI();

async function Init_UI() {
    currentETag = await Posts_API.HEAD();
    renderPosts();
    $('#createPost').on("click", async function () {
        saveContentScrollPosition();
        renderCreatePostForm();
    });
    $('#abort').on("click", async function () {
        renderPosts();
    });
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    start_Periodic_Refresh();
}

function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!hold_Periodic_Refresh) {
            let etag = await Posts_API.HEAD();
            if (currentETag != etag) {
                currentETag = etag;
                renderPosts();
            }
        }
    },
        periodicRefreshPeriod * 1000);
}

function renderAbout() {
    saveContentScrollPosition();
    eraseContent();
    $("#createPost").hide();
    $("#abort").show();
    $("#actionTitle").text("À propos...");
    $("#content").append(
        $(`
            <div class="aboutContainer">
                <h2>Gestionnaire de publications</h2>
                <hr>
                <p>
                    Petite application de gestion de publications à titre de démonstration
                    d'interface utilisateur monopage réactive.
                </p>
                <p>
                    Auteur: Houari Annabi & Olivier Renaud
                </p>
                <p>
                    Collège Lionel-Groulx, Automne 2024
                </p>
            </div>
        `))
}
function updateDropDownMenu(categories) {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#allCatCmd').on("click", function () {
        selectedCategory = "";
        renderPosts();
    });
    $('.category').on("click", function () {
        selectedCategory = $(this).text().trim();
        renderPosts();
    });
}
function compileCategories(posts) {
    let categories = [];
    if (posts != null) {
        posts.forEach(post => {
            if (!categories.includes(post.Category))
                categories.push(post.Category);
        })
        updateDropDownMenu(categories);
    }
}
async function renderPosts() {
    hold_Periodic_Refresh = false;
    showWaitingGif();
    $("#actionTitle").text("Liste des publications");
    $("#createPost").show();
    $("#abort").hide();
    let response = await Posts_API.Get();
    currentETag = response.ETag;
    let Posts = response.data;
    compileCategories(Posts)
    eraseContent();
    if (Posts !== null) {
        Posts.forEach(Post => {
            if ((selectedCategory === "") || (selectedCategory === Post.Category))
                $("#content").append(renderPost(Post));
        });
        restoreContentScrollPosition();
        // Attached click events on command icons
        $(".editCmd").on("click", function () {
            saveContentScrollPosition();
            renderEditPostForm($(this).attr("editpostId"));
        });
        $(".deleteCmd").on("click", function () {
            saveContentScrollPosition();
            renderDeletePostForm($(this).attr("deletepostId"));
        });
    } else {
        renderError("Service introuvable");
    }
}
function showWaitingGif() {
    $("#content").empty();
    $("#content").append($("<div class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
}
function eraseContent() {
    $("#content").empty();
}
function saveContentScrollPosition() {
    contentScrollPosition = $("#content")[0].scrollTop;
}
function restoreContentScrollPosition() {
    $("#content")[0].scrollTop = contentScrollPosition;
}
function renderError(message) {
    eraseContent();
    $("#content").append(
        $(`
            <div class="errorContainer">
                ${message}
            </div>
        `)
    );
}
function renderCreatePostForm() {
    renderPostForm();
}
async function renderEditPostForm(id) {
    showWaitingGif();
    let response = await Posts_API.Get(id)
    let Post = response.data;
    if (Post !== null)
        renderPostForm(Post);
    else
        renderError("Publication introuvable!");
}
async function renderDeletePostForm(id) {
    showWaitingGif();
    $("#createPost").hide();
    $("#abort").show();
    $("#actionTitle").text("Retrait");
    let response = await Posts_API.Get(id)
    let Post = response.data;
    eraseContent();
    if (Post !== null) {
        $("#content").append(`
        <div class="PostdeleteForm">
            <h4>Effacer la publication suivante?</h4>
            <br>
            <!--TODO-->
            <br>
            <input type="button" value="Effacer" id="deletePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </div>    
        `);
        $('#deletePost').on("click", async function () {
            showWaitingGif();
            let result = await Posts_API.Delete(Post.Id);
            if (result)
                renderPosts();
            else
                renderError("Une erreur est survenue!");
        });
        $('#cancel').on("click", function () {
            renderPosts();
        });
    } else {
        renderError("Publication introuvable!");
    }
}
function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    console.log(jsonObject);
    return jsonObject;
}
function newPost() {
    Post = {};
    Post.Id = "";
    Post.Title = "";
    Post.Text = "";
    Post.Category = "";
    Post.Image = "";
    Post.Creation = "";
    return Post;
}
function renderPostForm(Post = null) {
    $("#createPost").hide();
    $("#abort").show();
    eraseContent();
    hold_Periodic_Refresh = true;
    let create = Post == null;
    if (create){
        Post = newPost();
        Post.Image = "images/no-post.jpg";
        Post.Creation = secondsToDateString(nowInSeconds());
    }
    $("#actionTitle").text(create ? "Création" : "Modification");
    $("#content").append(`
        <form class="form" id="PostForm">
            <input type="hidden" name="Id" value="${Post.Id}"/>
            <input type="hidden" name="Creation" value="${Post.Creation}"/>

            <label for="Title" class="form-label">Titre: </label>
            <input 
                class="form-control Alpha"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${Post.Title}"
            />
            <label for="Text" class="form-label">Description: </label>
            <textarea
                class="form-control Alpha"
                name="Text"
                id="Text"
                placeholder="Description"
                required>${Post.Text}</textarea>
            <label for="Category" class="form-label">Catégorie: </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${Post.Category}"
            />
            <!-- nécessite le fichier javascript 'imageControl.js' -->
            <label class="form-label">Photo: </label>
            <div class='imageUploader'
                newImage='${create}' 
                controlId='Image' 
                imageSrc='${Post.Image}' 
                waitingImage="Loading_icon.gif"
                style="cursor:pointer;">
            </div>
            <br>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </form>
    `);
    initImageUploaders(); 
    initFormValidation();
    $('#PostForm').on("submit", async function (event) {
        event.preventDefault();
        let Post = getFormData($("#PostForm"));
        Post.Title = capitalizeFirstLetter(Post.Title);
        Post.Text = capitalizeFirstLetter(Post.Text);
        Post.Category = capitalizeFirstLetter(Post.Category);
        if (!Post.Creation)
            Post.Creation = secondsToDateString(nowInSeconds());
        showWaitingGif();
        let result = await Posts_API.Save(Post, create);
        if (result)
            renderPosts();
        else
            renderError("Une erreur est survenue!");
    });
    $('#cancel').on("click", function () {
        renderPosts();
    });
}
function renderPost(Post) {
    //Temporary
    return $(`
    <div class="PostContainer" Post_id=${Post.Id}">
        <div class="Post noselect">
            <div>${Post.Title}</div>
            <div>${Post.Category}</div>
            <div>${Post.Creation}</div>
            <div>${Post.Text}</div>
            <div>${Post.Image}</div>
            <div class="PostCommandPanel">
                <span class="editCmd cmdIcon fa fa-pencil" editPostId="${Post.Id}" title="Modifier ${Post.Title}"></span>
                <span class="deleteCmd cmdIcon fa fa-trash" deletePostId="${Post.Id}" title="Effacer ${Post.Title}"></span>
            </div>
        </div>
    </div>           
    `);
}
function capitalizeFirstLetter(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function secondsToDateString(dateInSeconds, localizationId = 'fr-FR') {
    const hoursOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    return new Date(dateInSeconds * 1000).toLocaleDateString(localizationId, hoursOptions);
}
const nowInSeconds = () => {
    const now = new Date();
    return Math.round(now.getTime() / 1000);
}