'use strict';


const store = new Vuex.Store({
  state: {

    // git commits store
    apiURL: 'https://api.github.com/',
    user: "python",
    projects: [],
    project: "",
    branches: [],
    currentBranch: '',
    count: "",
    commits: null,

    // populars table store
    popSearchQuery: '',
    popColumns: ['name', 'repos'],
    popRepos: [
      { name: 'Python', repos: 62 },
      { name: 'Ridj', repos: 16 },
      { name: 'KanViner', repos: 1 },
      { name: 'VueJS', repos: 87 },
      { name: 'Django', repos: 19 },
      { name: 'Vinta', repos: 32, title: 'Awesome Python' }
    ]
  },

  getters: {
    prettyBranch: state => state.currentBranch + '[branch]'
  },

  mutations: {
    // git commits mutations
    setBranch: (state, branch) => state.currentBranch = branch,
    setBranchesList: (state, branches) => state.branches = branches,
    setCommits: (state, commits) => state.commits = commits,
    setCount: (state, count) => state.count = count || "1",
    setName: (state, name) => state.user = name,
    setProject: (state, project) => state.project = project,
    setProjectsList: (state, projects) => state.projects = projects,

    // popular table mutations
    setQuery: (state, query) => state.popSearchQuery = query
  },

  actions: {
    // git commits actions
    chooseBranch: ({commit}, value) => commit('setBranch', value),
    inputCount: ({commit}, count) => commit('setCount', count),
    inputName: ({commit}, value) => {
      commit('setName', value);
      commit('setBranchesList', []);
      commit('setBranch', 'master');
      commit('setProjectsList', []);
      commit('setProject', '');
      commit('setCommits', null);
    },
    inputProject: ({commit}, value) => commit('setProject', value),

    updateApp: ({commit}, url) => {
      switch (url[1]) {

        case 1:
          fetch(url[0])
            .then(response => response.json())
              .then(response => commit('setProjectsList', response.map(item => item.name)))
          return;

        case 2:
          fetch(url[0])
            .then(response => response.json())
              .then(response => commit('setBranchesList', response.map(item => item.name)))
                .then(response => {
                  fetch(url[0].slice(0, -8) + "commits")
                    .then(response => response.json())
                      .then(response => commit('setCommits', response));
                });
          return;

        case 3:
          fetch(url[0])
            .then(response => response.json())
              .then(response => commit('setCommits', response));
          return;
      }
    },

    // popular table actions
    popSearch: ({commit}, query) => commit('setQuery', query)
  }
});


// Radio-buttons component to choose branch
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
        <br>
      </template>
    </div>`
};


// Commits of github project - component for listing commits
const githubCommits = {
  computed: Vuex.mapState({
    commits: state => state.commits
  }),

  filters: {
    truncate: (v) =>  v.indexOf('\n') > 0 ? v.slice(0, v.indexOf('\n')) : v,
    formatDate: (v) =>  v.replace(/T|Z/g, ' '),
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
    </ul>`
};


// Popular repos - component for tabling popular repos
const popularRepos = {
  props: {
    data: Array,
    columns: Array,
    filterKey: String
  },

  data () {
    let sortOrders = {};
    this.columns.forEach(key => sortOrders[key] = 1);
    return {
      sortKey: '',
      sortOrders: sortOrders
    }
  },

  computed: {
    filteredData: function() {
      let sortKey = this.sortKey;
      let filterKey = this.filterKey && this.filterKey.toLowerCase();
      let order = this.sortOrders[sortKey] || 1;
      let data = this.data;
      if (filterKey) {
        data = data.filter(
          row => Object.keys(row).some(
            key => String(row[key]).toLowerCase().indexOf(filterKey) > -1))
      }
      if (sortKey) {
        data = data.slice().sort((a, b) => {
          a = a[sortKey];
          b = b[sortKey];
          return (a === b ? 0 : a > b ? 1 : -1) * order;
        })
      }
      return data
    }
  },

  filters: {
    capitalize: (v) =>  v[0].toUpperCase() + v.slice(1)
  },

  methods: {
    sortBy: function(key) {
      this.sortKey = key;
      this.sortOrders[key] = -this.sortOrders[key];
    },
    setInput: function(username) {
      document.getElementById('username').value = username;
      this.$store.dispatch('inputName', username)
    }
  },

  template: `
    <table>
      <thead>
        <tr>
          <th v-for="key in columns"
            @click="sortBy(key)"
            :key="key"
            :class="{ active: sortKey == key }">
            {{ key | capitalize }}
            <span
              class="arrow"
              :class="sortOrders[key] > 0 ? 'asc' : 'dsc'">
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in filteredData">
          <td v-for="key in columns">
            <span
              v-if="key === 'name'"
              class="repos"
              :title="entry.title"
              @click="setInput($event.target.innerText)">
              {{ entry[key] }}
            </span>
            <span v-else>{{ entry[key] }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  `
};


const github = new Vue({
  el: '#app',
  store,

  computed: {
    ...Vuex.mapState({
      // git commits state
      url: state => state.apiURL,
      branches: state => state.branches,
      current: state => state.currentBranch,
      user: state => state.user,
      projects: state => state.projects,
      project: state => state.project,
      count: state => state.count,

      // popular repos state
      query: state => state.popSearchQuery,
      columns: state => state.popColumns,
      tableData: state => state.popRepos
    }),
    ...Vuex.mapGetters([
      'prettyBranch'
    ])
  },

  created() {
    this.updateApp([this.getUrl(1), 1]);
  },

  watch: {
    user () {
      this.updateApp([this.getUrl(1), 1]);
    },
    project () {
      this.updateApp([this.getUrl(2), 2]);
    },
    count () {
      this.updateApp([this.getUrl(), 3]);
    },
    current () {
      this.updateApp([this.getUrl(), 3]);
    }
  },

  methods: {
    ...Vuex.mapActions({
      setBranch: 'chooseBranch',
      setCount: 'inputCount',
      setName: 'inputName',
      setProject: 'inputProject',
      updateApp: 'updateApp',
      searchPop: 'popSearch'
      }),

    getUrl(command) {
      switch (command) {
        case 1:
          return this.url + 'users/' + this.user + '/repos';
        case 2:
          return this.url + 'repos/' + this.user + '/' +
            this.project + '/branches';
        default:
          if (!this.current) this.setBranch('master');
          return this.url + 'repos/' + this.user + '/' + this.project +
            '/commits?per_page=' + this.count + '&sha=' + this.current;
      }
    }
  },

  components: {
    githubButtons,
    githubCommits,
    popularRepos,
  },

  filters: {
    capitalize: (v) =>  v[0].toUpperCase() + v.slice(1)
  },

  template: `
    <div id="github">
      <div v-if="project">
        <h1>Latest "{{project | capitalize }}" commits</h1>
      </div>
      <h2 v-else>Choose user and project to start!</h2>

      <div id="popular">
        <popular-repos
          :data="tableData"
          :columns="columns"
          :filter-key="query" /><br>
        <label>Search:
        <form id="searchPop">
          <input
            name="query"
            :value="query"
            @input="searchPop($event.target.value)">
        </form></label><br>

        <label class="username">Input username:<br>
          <input
            id="username"
            type="text"
            :value="user"
            @change="setName($event.target.value)" />
        </label><br>

        <label v-if="projects.length">Select project:<br>
          <select
            id="project-select"
            :value="project"
            @change="setProject($event.target.value)">
            <option disabled selected value="">Choose project</option>
            <option
              v-for="proj in projects"
              :key="proj"
              :value="proj">
              {{proj | capitalize }}
            </option>
          </select>
        </label>
      </div>

      <div v-if="project">
        <github-buttons />
      </div><br>

      <div v-if="project">
        <label>Select number of records: 
          <input
            type="number"
            min="0"
            max="50"
            :value="count"
            @change="setCount($event.target.value)" />
          </label>
        <p>{{ user | capitalize }} / {{ project | capitalize }} @{{ prettyBranch }}</p>
        <github-commits />
      </div>

    </div>`
});
