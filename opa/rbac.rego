package httpapi.rbac

import input as req

import data.access_policies

default allow = false

allow {
  service_access = access_policies[req.origin][_]
  service_access[_] = req.destination
}
