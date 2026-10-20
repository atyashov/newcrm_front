import { createRouter, createWebHistory } from "vue-router"
import Dashboard from "../views/Dashboard.vue"
import Tables from "../views/Tables.vue"
import Billing from "../views/Billing.vue"
import RTL from "../views/Rtl.vue"
import Notifications from "../views/Notifications.vue"
import Profile from "../views/Profile.vue"
import SignIn from "../views/SignIn.vue"
import SignUp from "../views/SignUp.vue"
import CreateOutlay from "../views/CreateOutlay.vue"
import OutlayInfo from "../views/OutlayInfo.vue"
import Individuals from "../views/Individuals.vue"
import LegalEntities from "../views/LegalEntities.vue"
import ClientTypes from "../views/ClientTypes.vue"
import Roles from "../views/Roles.vue"
import Menus from "../views/Menus.vue"
import Products from "../views/Products.vue"
import FetchProductsFromSite from "../views/FetchProductsFromSite.vue"
import PaymentMethods from "../views/PaymentMethods.vue"
import Stores from "../views/Stores.vue"
import ExpenseGroups from "../views/ExpenseGroups.vue"
import Cashes from "../views/Cashes.vue"
import OutlayGroupNames from "../views/OutlayGroupNames.vue"
import OutlayStatuses from "../views/OutlayStatuses.vue"
import Users from "../views/Users.vue"
import Subdivisions from "../views/Subdivisions.vue"

const routes = [
  { path: "/users", name: "Пользователи", component: Users },
  { path: "/subdivisions", name: "Подразделения", component: Subdivisions },
  {
    path: "/outlay-statuses",
    name: "Статусы смет",
    component: OutlayStatuses,
  },
  {
    path: "/outlay-groups",
    name: "Группы товаров в смете",
    component: OutlayGroupNames,
  },
  {
    path: "/outlay-group-names",
    alias: ["/outlay-group-name"],
    redirect: "/outlay-groups",
  },
  {
    path: "/",
    name: "/",
    redirect: "/dashboard",
  },
  {
    path: "/dashboard",
    name: "Панель управления",
    component: Dashboard,
  },
  {
    path: "/individuals",
    name: "Физические лица",
    component: Individuals,
  },
  {
    path: "/legal-entity",
    name: "Юридические лица",
    component: LegalEntities,
  },
  {
    path: "/client-types",
    name: "Типы контрагентов",
    component: ClientTypes,
  },
  {
    path: "/roles",
    name: "Роли",
    component: Roles,
  },
  {
    path: "/menu-access",
    name: "Меню",
    component: Menus,
  },
  {
    path: "/tables",
    name: "Tables",
    component: Tables,
  },
  {
    path: "/billing",
    name: "Billing",
    component: Billing,
  },
  {
    path: "/rtl-page",
    name: "RTL",
    component: RTL,
  },
  {
    path: "/notifications",
    name: "Notifications",
    component: Notifications,
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
  },
  {
    path: "/sign-in",
    name: "SignIn",
    component: SignIn,
  },
  {
    path: "/sign-up",
    name: "SignUp",
    component: SignUp,
  },
  {
    path: "/outlays",
    alias: ["/my-outlays"],
    redirect: "/dashboard",
  },
  {
    path: "/outlays/create",
    alias: ["/create-outlay"],
    name: "Создать смету",
    component: CreateOutlay,
  },
  {
    path: "/outlays/:id/edit",
    name: "Редактировать смету",
    component: CreateOutlay,
  },
  { path: "/outlays/:id/info", name: "Информация о смете", component: OutlayInfo },
  {
    path: "/products",
    name: "Products",
    component: Products,
  },
  {
    path: "/load-products",
    name: "Загрузить товары с сайта",
    component: FetchProductsFromSite,
  },
  {
    path: "/payment-methods",
    name: "Способы оплаты",
    component: PaymentMethods,
  },
  {
    path: "/stores",
    name: "Склады",
    component: Stores,
  },
  {
    path: "/expense-groups",
    alias: ["/consumption-group", "/consumption-groups"],
    name: "Группы расходов",
    component: ExpenseGroups,
  },
  {
    path: "/cashes",
    name: "Кассы",
    component: Cashes,
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  linkActiveClass: "active",
})

export default router
