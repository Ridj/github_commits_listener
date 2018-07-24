'use strict';


const store = new Vuex.Store({
    state: {
        apiURL: 'https://api.github.com/',
        user: "python",
        projects: [],
        project: "",
        branches: [],
        currentBranch: '',
        count: "",
        commits: null
    },
    getters: {
        prettyBranch: state => state.currentBranch + '[branch]'
    },
    mutations: {
        setBranch: (state, branch) => state.currentBranch = branch,
        setBranchesList: (state, branches) => state.branches = branches,
        setCommits: (state, commits) => state.commits = commits,
        setCount: (state, count) => state.count = count || "1",
        setName: (state, name) => state.user = name,
        setProject: (state, project) => state.project = project,
        setProjectsList: (state, projects) => state.projects = projects
    },
    actions: {
        chooseBranch ({commit}, value) {
            commit('setBranch', value);
        },
        inputCount ({commit}, count) {
            commit('setCount', count);
        },
        inputName ({commit}, value) {
            commit('setName', value);
        },
        inputProject ({commit}, value) {
            commit('setProject', value);
        },
        updateApp ({commit}, url) {
            switch (url[1]) {
                case 1:
                  fetch(url[0])
                    .then(response => response.json())
                      .then(response =>  commit('setProjectsList', response.map(item => item.name)))
                  break;
                case 2:
                  fetch(url[0])
                    .then(response => response.json())
                      .then(response => commit('setBranchesList', response.map(item => item.name)))
                        .then(response => {
                            fetch(url[0].slice(0, -8) + "commits")
                              .then(response => response.json())
                                .then(response => commit('setCommits', response));
                            });
                  break;
                case 3:
                  fetch(url[0])
                    .then(response => response.json())
                      .then(response => commit('setCommits', response));
                  break;
            }
        }
    }
});


const githubButtons = {
    computed: Vuex.mapState({
        branches: state => state.branches
    }),
    methods: Vuex.mapActions({
        choose: 'chooseBranch'
    }),
    template: `
      <div id="github-buttons">
        <template v-for="branch in branches">
          <input
            type="radio"
            :id="branch"
            :value="branch"
            name="branch"
            @change="choose($event.target.value)" />
          <label :for="branch">{{ branch }}</label>
        </template>
      </div>
    `
}


const githubCommits = {
    computed: Vuex.mapState({
        commits: state => state.commits
    }),
    filters: {
        truncate: function(v) {
            let newline = v.indexOf('\n');
            return newline > 0 ? v.slice(0, newline) : v;
        },
        formatDate: function(v) {
            return v.replace(/T|Z/g, ' ');
        }
    },

    template: `
      <ul>
        <li v-for="record in commits">
          <a
            :href="record.html_url"
            class="commit"
            target="_blank">
            {{ record.sha.slice(0, 7) }}
          </a> - 
          <span class="message">
            {{ record.commit.message | truncate }}
          </span>
          <br> by 
          <span class="author">
            <a
              :href="record.author.html_url"
              target="_blank">
              {{ record.commit.author.name }}
            </a>
          </span> at 
          <span class="date">
            {{ record.commit.author.date | formatDate }}
          </span>
        </li>
      </ul>
    `
}


const github = new Vue({
    el: '#app',
    store,
    computed: {
      ...Vuex.mapState({
        url: state => state.apiURL,
        branches: state => state.branches,
        current: state => state.currentBranch,
        count: state => state.count,
        user: state => state.user,
        projects: state => state.projects,
        project: state => state.project
      }),
      ...Vuex.mapGetters([
        'prettyBranch'
      ])
    },

    created() {
        this.$store.dispatch("updateApp", [this.getUrl(1), 1]);
    },
    watch: {
        user () {
            this.$store.dispatch("updateApp", [this.getUrl(1), 1])
        },
        project () {
            this.$store.dispatch("updateApp", [this.getUrl(2), 2])
        },
        count () {
            this.$store.dispatch("updateApp", [this.getUrl(), 3])
        },
        current () {
            this.$store.dispatch("updateApp", [this.getUrl(), 3])
        }
    },

    methods: {
        getUrl(command) {
            switch (command) {
                case 1:
                  return this.url + 'users/' + this.user + '/repos';
                case 2:
                  return this.url + 'repos/' + this.user + '/' + this.project +
                    '/branches';
                default:
                  if (!this.current) this.$store.dispatch("chooseBranch", 'master');
                  return this.url + 'repos/' + this.user + '/' + this.project +
                    '/commits?per_page=' + this.count + '&sha=' + this.current;
            }
        },
        setCount: function(value) {
            this.$store.dispatch("inputCount", value);
        },
        setName: function(value) {
            this.$store.dispatch("inputName", value);
        },
        setProject: function(value) {
            this.$store.dispatch("inputProject", value);
        }
    },

    components: {
        githubButtons,
        githubCommits,
    },

    filters: {
        capitalize: (v) => {
            return v[0].toUpperCase() + v.slice(1);
        }
    },

    template: `
        <div id="github">
          <div v-if="project">
            <h1>Latest "{{project | capitalize }}" commits</h1>
            <github-buttons />
          </div>
          <h2 v-else>Choose user and project to start!</h2>
          <br><br>
          
          <label class="username">Input username:
            <input
              type="text"
              :value="user"
              @change="setName($event.target.value)" />
          </label>

          <label v-if="projects.length">Select project:
            <select
              :value="project"
              @change="setProject($event.target.value)">
              <option
                v-for="proj in projects"
                :key="proj"
                :value="proj"
                >
                {{proj | capitalize }}
              </option>
            </select>
          </label><br><br>

          <div v-if="project">
            <label>Select number of records: 
              <input
                type="number"
                min="0"
                max="50"
                :value="count"
                @change="setCount($event.target.value)" />
            </label>
            <p>{{ user | capitalize }} / {{ project | capitalize }} @{{ prettyBranch | capitalize }}</p>
            <github-commits />
          </div>

        </div>
    `
})
