package httpapi.service_rbac

import input as req
import data.service_access_policies

default allow = false

allow {
  service_access = service_access_policies[req.origin][_]
  service_access[_] = req.destination
}