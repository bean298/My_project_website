// Alias
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const PLAYER_STORAGE_KEY = "Bean";

const songAPI = "http://localhost:3000/songList";
const favoriteSongAPI = "http://localhost:3000/favoriteSongList";
const alternativeAPI = "./database/db.json";

const playlist = $(".playlist");
const heading = $("header h2");
const cd = $(".cd");
const cdThumb = $(".cd-thumb");
const audio = $("#audio");
const playBtn = $(".btn-toggle-play");
const player = $(".player");
const progress = $("#progress");
const nextBtn = $(".btn-next");
const prevBtn = $(".btn-prev");
const repeatBtn = $(".btn-repeat");
const randomBtn = $(".btn-random");

var songs = {};

async function init() {
  try {
    const res = await fetch(songAPI);
    if (!res.ok) {
      throw new Error("Network response was not ok");
    } else {
      const data = await res.json();
      songs = data.songList || data;
      app.start();
    }
  } catch (error) {
    console.error("Error fetching songs: ", error);
    fetchAlternativeData();
  }
}

async function fetchAlternativeData() {
  console.log("Starting fetchAlternativeData fucntion");
  try {
    const res = await fetch(alternativeAPI);
    if (!res.ok) {
      console.log("Network response was not ok from alternativeAPI");
      throw new Error("Network response was not ok");
    } else {
      const data = await res.json();
      songs = data.songList || data;
      app.start();
    }
  } catch (error) {
    console.log("Error fetching alternative data: ", error);
  }
}

const app = {
  currentIndex: 0,
  isPlaying: false,
  isRandom: false,
  isRepeat: false,
  config: JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)) || {},

  setConfig: function (key, value) {
    this.config[key] = value;
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(this.config));
  },

  loadConfig: function () {
    this.isRandom = this.config.isRandom;
    this.isRepeat = this.config.isRepeat;
  },

  setupToConfig: function () {
    if (this.isRandom) {
      randomBtn.classList.add("active");
    }
    if (this.isRepeat) {
      repeatBtn.classList.add("active");
    }
  },

  // Define properties for object
  defineProperties: function () {
    // Property currentSong contain current song
    Object.defineProperty(this, "currentSong", {
      get: function () {
        return songs[Object.keys(songs)[this.currentIndex]];
      },
    });
  },

  // Scroll into current song
  scrollToActiveSong: function () {
    setTimeout(() => {
      $(".song.active").scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  },

  // Render into view
  render: function () {
    const html = songs.map((song, index) => {
      return `
            <div class="song ${
              index === this.currentIndex ? "active" : ""
            }" data-index="${index}">
                <div class="thumb" style="background-image: url('${
                  song.image
                }')"></div>
                <div class="body">
                    <h3 class="title">${song.name}</h3>
                    <p class="author">${song.singer}</p>
                </div>
                <div class="option" data-index="${index}">
                    <i class="fas fa-ellipsis-h"></i>
                    <ul class="option_menu">
                      <li class="favoriteBtn">
                        <i class="far fa-heart"></i>
                        Add to favorite
                      </li>
                    </ul>
                </div>
            </div>
        `;
    });
    playlist.innerHTML = html.join("");
  },

  // Handle every events in web
  handleEvents: function () {
    const cdWidth = cd.offsetWidth; // Default width of CD
    const _this = this; // This: app

    // Event zoom in/out when scroll
    document.onscroll = function () {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const newCdWidth = cdWidth - scrollTop;

      cd.style.width = newCdWidth > 0 ? newCdWidth + "px" : 0;
      cd.style.opacity = newCdWidth / cdWidth;
    };

    // Event rotate / stop CD
    const cdThumbAnimate = cdThumb.animate([{ transform: "rotate(360deg)" }], {
      // animate function use 2 param: first is arr, two is config
      duration: 10000,
      iterations: Infinity,
    });
    cdThumbAnimate.pause();

    // Event when click btn play
    playBtn.onclick = function () {
      if (_this.isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    };

    // Handle event when song onplay
    audio.onplay = function () {
      _this.isPlaying = true;
      player.classList.add("playing");
      cdThumbAnimate.play();
    };

    // Handle event when song on pause
    audio.onpause = function () {
      _this.isPlaying = false;
      player.classList.remove("playing");
      cdThumbAnimate.pause();
    };

    // Handle the song progress changes
    audio.ontimeupdate = function () {
      if (audio.duration) {
        // Second / total time of song
        const progressPercent = Math.floor(
          (audio.currentTime / audio.duration) * 100
        );
        progress.value = progressPercent;
      }
    };

    // Handle fast forward song
    progress.oninput = function (e) {
      const seekTime = (audio.duration / 100) * e.target.value;
      audio.currentTime = seekTime;
    };

    // Handle click next song
    nextBtn.onclick = function () {
      if (_this.isRandom) {
        _this.randomSong();
      } else {
        _this.nextSong();
      }
      audio.play();
      _this.render(); // render view again to set active for song
      _this.scrollToActiveSong();
    };

    // Handle click previous song
    prevBtn.onclick = function () {
      if (_this.isRandom) {
        _this.randomSong();
      } else {
        _this.prevSong();
      }
      audio.play();
      _this.render(); // render view again to set active for song
      _this.scrollToActiveSong();
    };

    //  Handle when click btn random song
    randomBtn.onclick = function () {
      _this.isRandom = !_this.isRandom;
      _this.setConfig("isRandom", _this.isRandom);
      randomBtn.classList.toggle("active", _this.isRandom);
    };

    // Handle when click btn repeat song
    repeatBtn.onclick = function () {
      _this.isRepeat = !_this.isRepeat;
      _this.setConfig("isRepeat", _this.isRepeat);
      repeatBtn.classList.toggle("active", _this.isRepeat);
    };

    // Handle when audio ended
    audio.onended = function () {
      if (_this.isRepeat) {
        audio.play();
      } else {
        nextBtn.click();
      }
    };

    // Listen event select song
    playlist.onclick = function (e) {
      const songNode = e.target.closest(".song:not(.active)");
      const optionNode = e.target.closest(".option");
      const favoriteBtn = e.target.closest(".favoriteBtn");

      // closest return itself or parent tag, if don't have = null
      if (songNode || optionNode) {
        // Handle event click into song
        if (songNode && !optionNode) {
          _this.currentIndex = Number(songNode.dataset.index);
          _this.loadCurrentSong();
          _this.render();
          audio.play();
        }

        if (favoriteBtn) {
          const songIndex = Number(favoriteBtn.closest(".song").dataset.index);
          const song = songs[songIndex];
          _this.addToFavorite(song);
        }

        // Handle event click into option
        if (optionNode) {
          $(".option.active")?.classList.remove("active");
          optionNode.classList.add("active");
        }
      }
    };

    // Close menu option
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".option")) {
        $(".option.active")?.classList.remove("active");
      }
    });
  },

  // Load current song
  loadCurrentSong: function () {
    heading.textContent = this.currentSong.name;
    cdThumb.style.backgroundImage = `url('${this.currentSong.image}')`;
    audio.src = this.currentSong.path;
  },

  // Click btn next
  nextSong: function () {
    this.currentIndex++;
    if (this.currentIndex >= songs.length) {
      this.currentIndex = 0;
    }
    this.loadCurrentSong();
  },

  // Click btn previous
  prevSong: function () {
    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = songs.length - 1;
    }
    this.loadCurrentSong();
  },

  // Use random mode
  randomSong: function () {
    var randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * songs.length);
    } while (randomIndex === this.currentIndex);

    this.currentIndex = randomIndex;
    this.loadCurrentSong();
  },

  addToFavorite: function (song) {
    const favoriteSong = {
      name: song.name,
      singer: song.singer,
      path: song.path,
      image: song.image,
      id: song.id,
    };

    fetch(favoriteSongAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(favoriteSong),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Đã thêm vào yêu thích");
      });
  },

  init() {
    // Load config
    this.loadConfig();
    this.setupToConfig();

    // Define properties for object
    this.defineProperties();

    // Listen, handle event
    this.handleEvents();

    // Load the first song in list when open web
    this.loadCurrentSong();

    // Render
    this.render();
  },

  start() {
    console.log("App starting...");
    this.init();
  },
};

init();
